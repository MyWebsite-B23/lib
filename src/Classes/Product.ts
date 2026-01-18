import Utils from "../Utils";
import BaseModel, { BaseAttributes } from "./Base";
import { Color, LocalizedString, CountryCode, LocaleCode, LocalizedValue, Prettify } from './Common';
import { GenderCategory, ImageCategory, LocaleLanguageMap } from "./Enum";
import { DuplicateSelectionAttributeError, DuplicateSizeError, SelectionAttributeParseError } from "./Error";
import ImageInfoModel, { ImageInfoData } from "./ImageInfo";
import { TieredPriceModel, TieredPriceAttributes, TieredPriceData } from "./TieredPrice";

export type ProductSelectionAttributes = Prettify<{
  color: Color[];
  size: string[];
} & {
  [key: string]: string | string[] | Color[];
}>;

export type SelectionAttributes = {
  color: Color;
  [key: string]: string | Color;
};

export type VariantData = {
  sku: string;
  selectionAttributes: SelectionAttributes;
  images: {
    primary: ImageInfoData;
    gallery: ImageInfoData[];
  };
};

export type VariantModel = {
  sku: string;
  selectionAttributes: SelectionAttributes;
  images: {
    primary: ImageInfoModel;
    gallery: ImageInfoModel[];
  };
};


export type ProductSpecification = { [key: string]: string | string[] };

export type ProductAttributes = BaseAttributes & {
  id: string;
  key: string;

  name: LocalizedString;
  description: LocalizedString;
  slug: LocalizedString;
  brand: string;

  pricing: {
    [country in CountryCode]?: TieredPriceAttributes;
  };

  targetGender: GenderCategory;
  attributes: ProductSelectionAttributes;
  specifications: LocalizedValue<ProductSpecification>;
  categories: string[];

  variants: VariantData[];

  // Metadata
  isActive: boolean;
  searchTags?: LocalizedValue<string[]>;
};

export type ProductData = Required<ProductAttributes>

export default class ProductModel extends BaseModel {
  protected id: string;
  protected key: string;

  protected name: LocalizedString;
  protected description: LocalizedString;
  protected slug: LocalizedString;
  protected brand: string;

  protected pricing: {
    [country in CountryCode]?: TieredPriceModel;
  };

  protected variants: VariantModel[];

  protected targetGender: GenderCategory;
  protected attributes: ProductSelectionAttributes;
  protected specifications: LocalizedValue<ProductSpecification>;
  protected categories: string[];

  // Metadata
  protected isActive: boolean;

  protected searchTags: LocalizedValue<string[]>;

  static productKeyRegex = /^(?!\s)(?!.*\s$)[A-Z0-9-]{4,16}$/;
  static productSKURegex = /^(?!\s)(?!.*\s$)[A-Z0-9-]{4,16}$/;

  /**
   * Generates a unique key for checking uniqueness for a given selection attributes.
   * Excludes 'size' from the key generation.
   * @param selectionAttributes - The selection attributes.
   * @returns A string key representing the unique attribute combination.
   */
  static generateSelectionAttributesKey(selectionAttributes: SelectionAttributes): string {
    if (typeof selectionAttributes !== 'object') {
      throw new SelectionAttributeParseError('Selection attributes must be an object');
    }

    const sortedKeys = Object.keys(selectionAttributes)
      .filter(key => selectionAttributes[key] !== undefined && key.toLowerCase() !== 'size')
      .sort()

    return sortedKeys.map(key => {
      if ((selectionAttributes[key] as Color).name) {
        return `${key}:c+${(selectionAttributes[key] as Color).name}`;
      }
      return `${key}:${selectionAttributes[key]}`;
    }).join('|').toLowerCase();
  }

  /**
   * Parses a selection attributes key into an object.
   * @param key - The selection attributes key to parse.
   * @returns An object containing the parsed selection attributes.
   */
  static parseSelectionAttributesKey(key: string): SelectionAttributes {
    try {
      const attributes: SelectionAttributes = {} as unknown as SelectionAttributes;
      const parts = key.split('|');
      for (const part of parts) {
        const [key, value] = part.split(':');
        if (value.startsWith('c+')) {
          attributes[key] = { name: value.slice(2) } as Color;
        } else {
          attributes[key] = value;
        }
      }
      return attributes;
    } catch (error: any) {
      throw new SelectionAttributeParseError(error?.message);
    }
  }

  /**
   * Creates an instance of ProductModel.
   * Initializes properties based on the provided data, creating copies where necessary.
   * @param data - The initial product attributes.
   * @param date - Optional date for setting creation/modification times (defaults to now).
  */
  constructor(data: ProductAttributes, date: Date = new Date()) {
    super(data, date);

    this.id = data.id;
    this.key = data.key;

    this.name = { ...data.name };
    this.description = { ...data.description };
    this.slug = { ...data.slug };
    this.brand = data.brand;

    this.pricing = (Object.keys(data.pricing) as CountryCode[]).reduce((acc, country) => {
      if (data.pricing[country]) {
        acc[country] = new TieredPriceModel(data.pricing[country]);
      }
      return acc;
    }, {} as { [country in CountryCode]?: TieredPriceModel });

    this.targetGender = data.targetGender;
    this.attributes = Utils.deepClone(data.attributes);
    this.specifications = Utils.deepClone(data.specifications);
    this.categories = Utils.deepClone(data.categories);

    const uniqueSelectionAttributes = new Set<string>();
    this.variants = (data.variants || []).map(variant => {
      if (!variant.selectionAttributes || typeof variant.selectionAttributes !== 'object') {
        throw new SelectionAttributeParseError('Selection attributes are required');
      }

      this.checkSelectionAttributes(variant.selectionAttributes);
      const key = ProductModel.generateSelectionAttributesKey(variant.selectionAttributes);
      if (uniqueSelectionAttributes.has(key)) {
        throw new DuplicateSelectionAttributeError(key);
      }
      uniqueSelectionAttributes.add(key);
      return {
        sku: variant.sku,
        selectionAttributes: variant.selectionAttributes,
        images: {
          primary: new ImageInfoModel(variant.images.primary),
          gallery: (variant.images.gallery || []).map(image => new ImageInfoModel(image))
        }
      };
    });

    this.isActive = data.isActive;
    this.searchTags = data.searchTags ? Utils.deepClone(data.searchTags) : { en: [] };
  }

  /**
   * Gets the base Product ID.
   * @returns Product ID.
  */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the user-friendly product key.
   * @returns Product Key.
   */
  getKey(): string {
    return this.key;
  }

  /**
   * Gets the full localized product name object.
   * @returns A copy of the LocalizedString object for the name.
   */
  getName(): LocalizedString
  /**
   * Gets the product name for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The name string for the specified locale.
   */
  getName(locale: LocaleCode): string
  getName(locale?: LocaleCode): LocalizedString | string {
    if (locale) {
      return this.name[locale] ?? this.name[LocaleLanguageMap[locale]] ?? this.name.en;
    } else {
      return Utils.deepClone(this.name);
    }
  }

  /**
   * Gets the full localized product description object.
   * @returns A copy of the LocalizedString object for the description.
   */
  getDescription(): LocalizedString
  /**
   * Gets the product description for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The description string for the specified locale.
   */
  getDescription(locale: LocaleCode): string
  getDescription(locale?: LocaleCode): LocalizedString | string {
    if (locale) {
      return this.description[locale] ?? this.description[LocaleLanguageMap[locale]] ?? this.description.en;
    } else {
      return Utils.deepClone(this.description);
    }
  }

  /**
   * Gets the full localized product slug object.
   * @returns A copy of the LocalizedString object for the slug.
   */
  getSlug(): LocalizedString
  /**
   * Gets the product slug for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The slug string for the specified locale.
   */
  getSlug(locale: LocaleCode): string
  getSlug(locale?: LocaleCode): LocalizedString | string {
    if (locale) {
      return this.slug[locale] ?? this.slug[LocaleLanguageMap[locale]] ?? this.slug.en;
    } else {
      return Utils.deepClone(this.slug);
    }
  }

  /**
   * Gets the brand associated with the product.
   * @returns The brand name string.
   */
  getBrand(): string {
    return this.brand;
  }

  /**
   * Gets the tiered price details for the product.
   * @returns Pricing details mapped by country.
   */
  getPriceDetails(): { [country in CountryCode]?: TieredPriceModel }
  /**
   * Gets the tiered price details for a specific country.
   * @param country - The country code.
   * @returns The tiered price model for the country, or null if not found.
   */
  getPriceDetails(country: CountryCode): TieredPriceModel | null
  getPriceDetails(country?: CountryCode): { [country in CountryCode]?: TieredPriceModel } | TieredPriceModel | null {
    if (country) {
      return this.pricing[country] ?? null;
    }
    return this.pricing;
  }

  /**
   * Gets the variant-specific attributes (color, sizes). Returns copies.
   * @returns Product Attributes.
   */
  getAttributes(): ProductSelectionAttributes {
    return Utils.deepClone(this.attributes);
  }


  /**
   * Gets the variant-specific attributes (color, sizes). Returns copies.
   * @returns Product Attributes.
   */
  getVariants(): VariantModel[] {
    return this.variants.map(variant => ({
      sku: variant.sku,
      selectionAttributes: variant.selectionAttributes,
      images: {
        primary: variant.images.primary,
        gallery: variant.images.gallery
      }
    }));
  }

  /**
   * Gets the images for a specific selection attribute combination.
   * @param selectionAttributes - The selection attributes to search for.
   * @returns The matching image set or null if not found.
   */
  private getImagesBySelectionAttributes(selectionAttributes: SelectionAttributes): { primary: ImageInfoModel; gallery: ImageInfoModel[] } | null {
    const searchKey = ProductModel.generateSelectionAttributesKey(selectionAttributes);

    const match = this.variants.find(variant =>
      ProductModel.generateSelectionAttributesKey(variant.selectionAttributes) === searchKey
    );

    return match ? match.images : null;
  }

  /**
   * Gets the images for a specific selection attribute combination.
   * @param selectionAttributes - The selection attributes to search for.
   * @returns The matching image set or null if not found.
   */
  getImages(selectionAttributes: SelectionAttributes): { primary: ImageInfoModel; gallery: ImageInfoModel[] }
  getImages(selectionAttributes: SelectionAttributes, category: ImageCategory.PRIMARY): ImageInfoModel
  getImages(selectionAttributes: SelectionAttributes, category: ImageCategory.GALLERY): ImageInfoModel[]
  getImages(selectionAttributes: SelectionAttributes, category?: ImageCategory): { primary: ImageInfoModel; gallery: ImageInfoModel[] } | ImageInfoModel | ImageInfoModel[] {
    switch (category) {
      case ImageCategory.PRIMARY:
        return this.getImagesBySelectionAttributes(selectionAttributes)?.primary ?? this.variants[0]?.images?.primary;
      case ImageCategory.GALLERY:
        return this.getImagesBySelectionAttributes(selectionAttributes)?.gallery ?? [];
      default:
        return this.getImagesBySelectionAttributes(selectionAttributes) ?? { primary: this.variants[0]?.images?.primary, gallery: [] };
    }
  }


  /**
   * Checks if the product is active.
   * @returns True if the product is active, false otherwise.
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Gets the target gender category for the product.
   * @returns The GenderCategory enum value.
   */
  getTargetGender(): GenderCategory {
    return this.targetGender;
  }

  /**
   * Gets the list of categories the product belongs to. Returns a copy.
   * @returns An array of category.
   */
  getCategories(): string[] {
    return Utils.deepClone(this.categories);
  }

  /**
   * Gets the full localized product specifications object.
   * @returns Product Specifications
   */
  getSpecifications(): LocalizedValue<ProductSpecification>
  /**
   * Gets the product specifications for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The ProductSpecification object for the specified locale, or undefined if not found.
   */
  getSpecifications(locale: LocaleCode): ProductSpecification
  getSpecifications(locale?: LocaleCode): LocalizedValue<ProductSpecification> | ProductSpecification {
    if (locale) {
      return Utils.deepClone(this.specifications[locale] ?? this.specifications[LocaleLanguageMap[locale]] ?? this.specifications.en);
    } else {
      return Utils.deepClone(this.specifications);
    }
  }

  /**
   * Gets the localized list of search tags. Returns a copy.
   * @returns Localized array of search tags.
   */
  getSearchTags(): LocalizedValue<string[]>
  /**
   * Gets the search tags for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The array of search tags for the specified locale, or undefined if not found.
   */
  getSearchTags(locale: LocaleCode): string[]
  getSearchTags(locale?: LocaleCode): LocalizedValue<string[]> | string[] {
    if (locale) {
      return Utils.deepClone(this.searchTags[locale] ?? this.searchTags[LocaleLanguageMap[locale]] ?? this.searchTags.en);
    } else {
      return Utils.deepClone(this.searchTags);
    }
  }

  /**
   *
   * @returns ProductData
   */
  getDetails(): ProductData {
    const baseDetails = super.getDetails();
    return {
      id: this.getId(),
      key: this.getKey(),
      name: this.getName(),
      description: this.getDescription(),
      slug: this.getSlug(),
      brand: this.getBrand(),
      pricing: (Object.keys(this.pricing) as CountryCode[]).reduce((acc, country) => {
        if (this.pricing[country]) {
          acc[country] = this.pricing[country]?.getDetails();
        }
        return acc;
      }, {} as { [country in CountryCode]: TieredPriceData }),
      attributes: this.getAttributes(),
      variants: this.variants.map(v => ({
        sku: v.sku,
        selectionAttributes: Utils.deepClone(v.selectionAttributes),
        images: {
          primary: v.images.primary.getDetails(),
          gallery: v.images.gallery.map(img => img.getDetails())
        }
      })),
      isActive: this.getIsActive(),
      targetGender: this.getTargetGender(),
      categories: this.getCategories(),
      specifications: this.getSpecifications(),
      searchTags: this.getSearchTags(),
      ...baseDetails
    };
  }

  /**
   * Checks if the provided selection attributes are valid for the product.
   * @param selectionAttributes The selection attributes to validate.
   * @throws {SelectionAttributeParseError} If the selection attributes are invalid.
   */
  checkSelectionAttributes(selectionAttributes: SelectionAttributes): void {
    if (!selectionAttributes || typeof selectionAttributes !== 'object') {
      throw new SelectionAttributeParseError('Selection attributes are required');
    }

    Object.keys(this.attributes).forEach(key => {
      if(key.toLowerCase() === 'size') return;
      
      const allowedAttributeValues = this.attributes[key];
      const providedValue = selectionAttributes[key];

      if (providedValue === undefined) {
        throw new SelectionAttributeParseError(`Selection attribute '${key}' is missing`);
      }

      if (typeof allowedAttributeValues === 'string') {
        if (typeof providedValue !== 'string' || allowedAttributeValues !== providedValue) {
          throw new SelectionAttributeParseError(`Selection attribute '${key}' is invalid`);
        }
      } else if (Array.isArray(allowedAttributeValues)) {
        if (allowedAttributeValues.length > 0 && typeof allowedAttributeValues[0] === 'string') {
          if (typeof providedValue !== 'string' || !(allowedAttributeValues as string[]).includes(providedValue)) {
            throw new SelectionAttributeParseError(`Selection attribute '${key}' is invalid`);
          }
        } else {
          // Color validation
          if (
            typeof providedValue !== 'object' ||
            !('name' in providedValue) ||
            (allowedAttributeValues as Color[]).findIndex(c => c.name === (providedValue as Color).name) < 0
          ) {
            throw new SelectionAttributeParseError(`Selection attribute '${key}' is invalid`);
          }
        }
      }
    });
  }

  /**
   * Validates if the provided selection attributes exist for this product.
   * @param selectionAttributes - The attributes to validate.
   * @returns True if a valid selection attribute exists, false otherwise.
   */
  validateSelectionAttribute(selectionAttributes: SelectionAttributes): boolean {
    const searchKey = ProductModel.generateSelectionAttributesKey(selectionAttributes);

    return this.variants.some(variant => ProductModel.generateSelectionAttributesKey(variant.selectionAttributes) === searchKey);
  }

  /**
   * Validates if a specific size is available for this product.
   * @param size - The size to check.
   * @returns True if the size exists in the product's attributes, false otherwise.
   */
  validateSize(size: string): boolean {
    return this.attributes.size.includes(size);
  }
}
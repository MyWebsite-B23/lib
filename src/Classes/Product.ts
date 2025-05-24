import BaseModel, { BaseAttributes } from "./Base";
import { BasePriceList, PriceTierList, Color, LocalizedString, CountryCode, LocaleCode, BasePrice } from './Common';
import { GenderCategory } from "./Enum";
import ImageInfoModel, { ImageInfoData } from "./ImageInfo";

export type ProductVariantIdentifier =  {
  key: string;
  variantId: string;
};

export type ProductHashKey = {
  id: string;
  variantId: string;
}

export type ProductAttributes = BaseAttributes & {
    id: string;
    key: string;
    variantId: string;

    name: LocalizedString;
    description: LocalizedString;
    slug: LocalizedString;
    brand: string;

    basePrices: BasePriceList;
    priceTiers: PriceTierList;

    attributes: {
      color: Color;
      sizes: string[];
    };

    primaryImage: ImageInfoData;
    additionalImages?: ImageInfoData[];

    // Metadata & Categorization
    isActive: boolean;
    targetGender: GenderCategory;
    categories: string[];
    specifications: LocalizedProductSpecification;
    searchTags?: string[];
};

export type ProductData = Required<ProductAttributes>

export type ProductSpecification = { [key: string]: string | string[] };

export type LocalizedProductSpecification = {
  en: ProductSpecification
} & {
  [locale in LocaleCode]?: ProductSpecification
}

export default class ProductModel extends BaseModel {
    protected id: string;
    protected key: string;
    protected variantId: string;

    protected name: LocalizedString;
    protected description: LocalizedString;
    protected slug: LocalizedString;
    protected brand: string;

    protected basePrices: BasePriceList;
    protected priceTiers: PriceTierList;

    protected attributes: {
      color: Color;
      sizes: string[];
    };

    protected primaryImage: ImageInfoModel;
    protected additionalImages: ImageInfoModel[];

    protected isActive: boolean;
    protected targetGender: GenderCategory;
    protected categories: string[];
    protected specifications: LocalizedProductSpecification;
    protected searchTags: string[];

    static productKeyRegex = /^(?!\s)(?!.*\s$)[A-Z0-9-]{4,16}$/;
    static variantIdRegex = /^(?!\s)(?!.*\s$)[A-Z0-9-]{4,16}$/;

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
        this.variantId = data.variantId;
        this.name = data.name;
        this.description = data.description;
        this.slug = data.slug;
        this.brand = data.brand;

        this.basePrices = data.basePrices.map(price => ({ ...price }));
        this.priceTiers = data.priceTiers ? 
          data.priceTiers.map(tier => ({ ...tier })) 
          : 
          data.basePrices.map(price => ({ ...price }));;

        this.attributes = {
            ...data.attributes,
            sizes: [...data.attributes.sizes]
        };

        this.primaryImage = new ImageInfoModel(data.primaryImage);
        this.additionalImages = (data.additionalImages || []).map(image => new ImageInfoModel(image));
        this.isActive = data.isActive;
        this.targetGender = data.targetGender;
        this.categories = [...data.categories];
        this.specifications = JSON.parse(JSON.stringify({ ...data.specifications }));
        this.searchTags = data.searchTags ? [...data.searchTags] : [];
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
   * Gets the specific Variant ID.
   * @returns Variant ID.
   */
  getVariantId(): string {
      return this.variantId;
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
    if(locale) {
      return this.name[locale] ?? this.name.en;
    } else {
      return { ...this.name };
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
  getDescription(locale?: LocaleCode): LocalizedString | string  {
    if(locale){
      return this.description[locale] ?? this.description.en;
    } else {
      return { ...this.description };
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
      return this.slug[locale] ?? this.slug.en;
    } else {
      return { ...this.slug };
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
   * Gets the base price(s) for the product variant.
   * If a country code is provided, it returns the specific base price defined for that country, or null if no price is defined for that country.
   * If no country code is provided, it returns a list of all defined base prices across different countries.
   * Returns copies of the price objects to prevent modification of internal state.
   *
   * @param country - Optional country code to retrieve the base price for a specific region.
   */
  getBasePrices(): BasePriceList
  getBasePrices(country: CountryCode): BasePrice | null
  getBasePrices(country?: CountryCode): BasePriceList | BasePrice | null {
    if(country) {
      const countryPrice = this.basePrices.find(price => price.country === country);
      return countryPrice ? { ...countryPrice } : null;
    }

    return this.basePrices.map(price => ({ ...price }));
  }

  /**
   * Gets the list of quantity-based price tiers for the product variant, sorted by minimum quantity in ascending order.
   * Returns copies of the price tier objects to prevent modification of internal state.
   * If a country code is provided, the list is filtered to include only tiers applicable to that country.
   *
   * @param country - Optional country code to filter the price tiers for a specific region.
   * @returns A sorted list (by `minQuantity`) of applicable `PriceTier` objects. Returns an empty list if no tiers are defined or if none match the specified country.
   */
  getPriceTiers(country?: CountryCode): PriceTierList {
    const filteredTiers = country ? this.priceTiers.filter(tier => tier.country === country) : this.priceTiers;
    return filteredTiers
      .map(tier => ({ ...tier }))
      .sort((a,b) => a.minQuantity - b.minQuantity);
  }

  /**
   * Gets the variant-specific attributes (color, sizes). Returns copies.
   * @returns Product Attributes.
   */
  getAttributes(): { color: Color; sizes: string[] } {
      return {
          ...this.attributes,
          color: { ...this.attributes.color },
          sizes: [...this.attributes.sizes]
      };
  }

  /**
   * Gets details of product's primary image.
   * @returns The ImageInfoModel instance for the primary image.
   */
  getPrimaryImage(): ImageInfoModel {
      return this.primaryImage;
  }

  /**
   * Gets the list of additional product images.
   * @returns An array of ImageInfoModel instances.
   */
  getAdditionalImages(): ImageInfoModel[] {
      return this.additionalImages;
  }

  /**
   * Checks if the product variant is active.
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
      return [...this.categories];
  }

  /**
   * Gets the full localized product specifications object.
   * @returns Product Specifications
   */
  getSpecifications(): LocalizedProductSpecification
  /**
   * Gets the product specifications for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The ProductSpecification object for the specified locale, or undefined if not found.
   */
  getSpecifications(locale: LocaleCode): ProductSpecification | undefined
  getSpecifications(locale?: LocaleCode): LocalizedProductSpecification | ProductSpecification | undefined {
      if(locale){
        return this.specifications[locale] ?? this.specifications.en;
      } else {
        return JSON.parse(JSON.stringify(this.specifications));
      }
  }

  /**
   * Gets the list of search tags. Returns a copy.
   * @returns An array of search tags.
   */
  getSearchTags(): string[] {
      return [...this.searchTags];
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
          variantId: this.getVariantId(),
          name: this.getName(),
          description: this.getDescription(),
          slug: this.getSlug(),
          brand: this.getBrand(),
          basePrices: this.getBasePrices(),
          priceTiers: this.getPriceTiers(),
          attributes: this.getAttributes(),
          primaryImage: this.getPrimaryImage().getDetails(),
          additionalImages: this.getAdditionalImages().map(image => image.getDetails()),
          isActive: this.getIsActive(),
          targetGender: this.getTargetGender(),
          categories: this.getCategories(),
          specifications: this.getSpecifications(),
          searchTags: this.getSearchTags(),
          ...baseDetails
      }; 
  }

  /**
   * Calculates the maximum potential discount percentage for a given country
   * based on the lowest price tier compared to the base price.
   * @param country - The country code to calculate the discount for.
   * @returns The maximum discount percentage (0-100), or 0 if calculation is not possible.
   */
  getMaxDiscountPercent(country: CountryCode): number {
    // Find base price for the country (should be unique per country)
    const basePrice = this.basePrices.find(price => price.country === country);

    // Find the lowest unit price among tiers for the country
    const lowestTierPrice = this.priceTiers
                                ?.filter(tier => tier.country === country) // Filter tiers for the country first
                                .sort((a, b) => a.unitPrice - b.unitPrice)[0]?.unitPrice; // Then sort and get lowest

    // Validate prices before calculation
    if (!basePrice || basePrice.unitPrice <= 0 || lowestTierPrice === undefined) {
        return 0; // Cannot calculate discount
    }

    // Calculate discount, ensuring it's not negative
    const discount = Math.max(0, basePrice.unitPrice - lowestTierPrice);

    // Calculate percentage
    return (discount / basePrice.unitPrice) * 100;
  }

  /**
   * Gets the minimum quantity required to purchase this product variant in a specific country,
   * based on the lowest minimum quantity defined in its price tiers for that country.
   *
   * @param country - The country code for which to determine the minimum purchase quantity.
   * @returns The minimum quantity required.
   * @throws {Error} If no price tiers are defined for the specified country.
   */
  getMinQuantity(country: CountryCode): number {
    const priceTiers = this.getPriceTiers(country);

    if (priceTiers.length === 0) {
      throw Error('No price tiers found for country');
    }
    return priceTiers[0].minQuantity;
  }

  
}
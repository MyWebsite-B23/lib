import { BasePrice, Color, LocaleCode, LocalizedString, PriceTier } from "./Common";
import ImageInfoModel, { ImageInfoData } from "./ImageInfo";
import { LocalizedProductSpecification, ProductSpecification } from "./Product";

export type SubItem = {
  size: string;
  quantity: number;
};

export type LineItemAttributes = {
    id: string;
    productKey: string;
    variantId: string;
    name: LocalizedString;
    attributes: {
        color: Color;
    };
    specifications: LocalizedProductSpecification;
    primaryImage: ImageInfoData;
    subItems: SubItem[];
    basePrice: BasePrice;
    priceTiers: PriceTier[];
}

export type LineItemData = LineItemAttributes & {
  totalQuantity: number;
  priceTotals: {
      subtotal: number;
      mrpTotal: number;
  };
}

/**
 * Represents a line item within a shopping cart.
 */
export default class LineItemModel {
  protected id: string;
  protected productKey: string;
  protected variantId: string;
  protected name: LocalizedString;
  protected attributes: {
      color: Color;
  };
  protected specifications: LocalizedProductSpecification;
  protected primaryImage: ImageInfoModel;
  protected subItems: SubItem[];
  protected totalQuantity: number;
  protected basePrice: BasePrice;
  protected priceTotals: {
      subtotal: number;
      mrpTotal: number;
  };
  protected priceTiers: PriceTier[];

  /**
   * Creates an instance of LineItemModel.
   * @param data - The initial line item attributes.
   */
  constructor(data: LineItemAttributes) {
      this.id = data.id;
      this.productKey = data.productKey;
      this.variantId = data.variantId;

      this.name = { ...data.name };
      this.attributes = { ...data.attributes };
      this.specifications = {...data.specifications };
      this.primaryImage = new ImageInfoModel(data.primaryImage);
      this.subItems = data.subItems.map(item => ({ ...item }));
      this.basePrice = { ...data.basePrice };
      this.priceTiers = data.priceTiers.map(tier => ({ ...tier }));

      this.totalQuantity = 0;
      this.priceTotals = {
          subtotal: 0,
          mrpTotal: 0
      };

      this.recalculateTotalQuantity();
      this.recalculatePriceTotal();
  }

  /** Gets the unique identifier of the line item. */
  getId(): string {
      return this.id;
  }

  /** Gets the product key associated with this line item. */
  getProductKey(): string {
      return this.productKey;
  }

  /** Gets the product variant ID associated with this line item. */
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


  /** Gets the variant attributes. */
  getAttributes(): { color: Color } {
      return { ...this.attributes };
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

  /** Gets the image information model for this line item. */
  getImage(): ImageInfoModel {
      return this.primaryImage;
  }

  /** Gets the sub-items (size/quantity breakdown). */
  getSubItems(): SubItem[] {
      return this.subItems.map(item => ({ ...item }));
  }

  /** Gets the total quantity for this line item across all sub-items. */
  getTotalQuantity(): number {
      return this.totalQuantity;
  }

  /** Gets the base price for a single unit. */
  getBasePrice(): BasePrice {
      return { ...this.basePrice };
  }

  /** Gets the calculated price details (subtotal, mrpTotal) for this line item. */
  getPriceTotals(): { subtotal: number; mrpTotal: number } {
      return { ...this.priceTotals };
  }

  /** Gets the applicable price tiers for this product variant. */
  getPriceTiers(): PriceTier[] {
      return this.priceTiers.map(tier => ({ ...tier }));
  }

  /**
   * Recalculates the total quantity based on the quantities in subItems.
   */
  protected recalculateTotalQuantity(): void {
      this.totalQuantity = this.subItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Recalculates the line item's price (subtotal and mrpTotal)
   * based on total quantity, base price, and applicable price tiers.
   */
  protected recalculatePriceTotal(): void {
      const quantity = this.totalQuantity;
      let unitPrice = this.basePrice.unitPrice;

      let applicableTier = null;
      for (const tier of this.priceTiers.sort((a, b) => b.minQuantity - a.minQuantity)) { 
          if (quantity >= tier.minQuantity) {
              applicableTier = tier;
              break;
          }
      }

      if (applicableTier) {
          unitPrice = applicableTier.unitPrice;
      }

      // Calculate totals
      this.priceTotals.mrpTotal = this.basePrice.unitPrice * quantity;
      this.priceTotals.subtotal = unitPrice * quantity;
  }


  /**
   * Gets a plain data object representing the line item's details.
   * @returns LineItemData.
   */
  getDetails(): LineItemData {
      return {
          id: this.getId(),
          productKey: this.getProductKey(),
          variantId: this.getVariantId(),
          name: this.getName(),
          attributes: this.getAttributes(),
          specifications: this.getSpecifications(),
          primaryImage: this.getImage().getDetails(),
          subItems: this.getSubItems(),
          totalQuantity: this.getTotalQuantity(),
          basePrice: this.getBasePrice(),
          priceTotals: this.getPriceTotals(),
          priceTiers: this.getPriceTiers(),
      };
  }
  
  /**
   * Adds or updates sub-items (e.g., sizes with quantities) to the line item.
   * If a sub-item with the same size already exists, its quantity is either
   * updated by adding the new quantity or replaced entirely, based on the `addQuantity` flag.
   * Sub-items with a resulting quantity of 0 are removed.
   * Recalculates total quantity and price totals afterwards.
   *
   * @param subItems - An array of `SubItem` objects to add or update.
   * @param addQuantity - If true, adds the quantity from `subItem` to the existing quantity.
   *                      If false, replaces the existing quantity with the one from `subItem`.
   */
  addSubItems(subItems: SubItem[], addQuantity: boolean): void {
    subItems.forEach(subItem => {
      const existingSubItem = this.subItems.find(item => item.size === subItem.size);
      if (existingSubItem) {
          existingSubItem.quantity = addQuantity ? existingSubItem.quantity + subItem.quantity : subItem.quantity;
      } else {
          this.subItems.push(subItem);
      }
    })
    this.subItems = this.subItems.filter(sub => sub.quantity);

    this.recalculateTotalQuantity();
    this.recalculatePriceTotal();
  }

  /**
   * Resets the line item's properties to their default empty or initial state.
   * Useful for clearing out line item data without creating a new instance.
   * Recalculates total quantity and price totals afterwards (which will be zero).
   */
  clearLineItem(): void {
    this.id = '';
    this.productKey = '';
    this.variantId = '';
    this.name = { en: '' };
    this.attributes = { color: { name: '', hex: '' } };
    this.primaryImage = new ImageInfoModel({ sources: { original: '' } });
    this.subItems = [];
    this.recalculateTotalQuantity();
    this.recalculatePriceTotal();
  }
}
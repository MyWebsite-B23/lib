import Utils from "../Utils";
import { Color, CountryCode, CurrencyCode, LocaleCode, LocalizedString, LocalizedValue } from "./Common";
import CouponModel from "./Coupon";
import { LineItemState, LocaleLanguageMap, TaxCategory, TaxSystem } from "./Enum";
import ImageInfoModel, { ImageInfoData } from "./ImageInfo";
import PriceModel, { PriceData } from "./Price";
import ProductModel, { ProductSelectionAttributes, ProductSpecification, SelectionAttributes } from "./Product";
import { TaxRuleModel, TaxSlabs } from "./TaxRule";
import { TieredPriceData, TieredPriceModel } from "./TieredPrice";
import {
  DuplicateSizeError,
  ProductMismatchError,
  ProductInactiveError,
  SizeMismatchError,
  PricingNotFoundError,
  InvalidTaxRuleError
} from "./Error";

export type SubItem = {
  size: string | 'ONESIZE';
  quantity: number;
};

export type LineItemPricing = {
  unitPrice: PriceData;
  tierPricing: TieredPriceData;
  taxCategory: TaxCategory;
  tax: {
    taxRuleId: string;
    taxSystem: TaxSystem;
    country: CountryCode;
    rate: number;
    taxSlabs: TaxSlabs;
  };
};

export type LineItemTotals = {
  quantity: number;
  subtotal: PriceData;
  discounts: Record<string, PriceData>; // couponCode -> discount mapping
  taxableAmount: PriceData; // subtotal - discount
  taxTotal: PriceData;
  grandTotal: PriceData;
};

export type LineItemAttributes = {
  id: string;

  productKey: string;
  selectionAttribute: SelectionAttributes;

  name: LocalizedString;
  specifications: LocalizedValue<ProductSpecification>;
  primaryImage: ImageInfoData;

  subItems: SubItem[];

  pricing: LineItemPricing;

  state?: LineItemState;
  total: LineItemTotals;
}

export type LineItemData = Required<LineItemAttributes>;

/**
 * Represents a line item within a shopping cart.
 */
export default class LineItemModel {
  protected id: string;
  protected productKey: string;
  protected selectionAttribute: SelectionAttributes;

  protected name: LocalizedString;
  protected specifications: LocalizedValue<ProductSpecification>;
  protected primaryImage: ImageInfoModel;
  protected subItems: SubItem[];
  protected pricing: {
    unitPrice: PriceModel;
    tierPricing: TieredPriceModel;
    taxCategory: TaxCategory;
    tax: {
      taxRuleId: string;
      taxSystem: TaxSystem;
      country: CountryCode;
      taxSlabs: TaxSlabs;
      rate: number;
    };
  };

  protected state: LineItemState;
  protected total: {
    quantity: number;
    subtotal: PriceModel;
    discounts: Record<string, PriceModel>;
    taxableAmount: PriceModel; // subtotal - discount

    taxTotal: PriceModel;
    grandTotal: PriceModel;
  };

  /**
   * Creates an instance of LineItemModel.
   * @param data - The initial line item attributes.
   */
  constructor(data: LineItemAttributes) {
    this.id = data.id;
    this.productKey = data.productKey;
    this.selectionAttribute = Utils.deepClone(data.selectionAttribute);

    this.name = Utils.deepClone(data.name);
    this.specifications = Utils.deepClone(data.specifications);
    this.primaryImage = new ImageInfoModel(data.primaryImage);
    this.subItems = Utils.deepClone(data.subItems);

    let uniqueSelectionAttributes = new Set();
    this.subItems.forEach(item => {
      if (uniqueSelectionAttributes.has(item.size)) {
        throw new DuplicateSizeError(item.size);
      }
      uniqueSelectionAttributes.add(item.size);
    });

    this.pricing = {
      unitPrice: new PriceModel(data.pricing.unitPrice),
      tierPricing: new TieredPriceModel(data.pricing.tierPricing),
      taxCategory: data.pricing.taxCategory,
      tax: {
        taxRuleId: data.pricing.tax.taxRuleId,
        taxSystem: data.pricing.tax.taxSystem,
        country: data.pricing.tax.country,
        rate: data.pricing.tax.rate,
        taxSlabs: Utils.deepClone(data.pricing.tax.taxSlabs),
      },
    }

    this.state = data.state ?? LineItemState.INITIAL;

    this.total = {
      quantity: data.total.quantity,
      subtotal: new PriceModel(data.total.subtotal),
      discounts: Object.fromEntries(
        Object.entries(data.total.discounts).map(([couponCode, discount]) => [
          couponCode,
          new PriceModel(discount),
        ])
      ),
      taxableAmount: new PriceModel(data.total.taxableAmount),
      taxTotal: new PriceModel(data.total.taxTotal),
      grandTotal: new PriceModel(data.total.grandTotal),
    }
  }

  /**
   * Gets the unique identifier of the line item.
   * @returns The unique ID string.
   */
  getId(): string {
    return this.id;
  }

  /**
   * Gets the product key associated with this line item.
   * @returns The product key string.
   */
  getProductKey(): string {
    return this.productKey;
  }

  /**
   * Gets the selection attributes (e.g., size, color) for this line item.
   * @returns A copy of the selection attributes object.
   */
  getSelectionAttribute(): SelectionAttributes {
    return Utils.deepClone(this.selectionAttribute);
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
      return Utils.deepClone(this.name[locale] ?? this.name[LocaleLanguageMap[locale]] ?? this.name.en);
    } else {
      return Utils.deepClone(this.name);
    }
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
  getSpecifications(locale: LocaleCode): ProductSpecification | undefined
  getSpecifications(locale?: LocaleCode): LocalizedValue<ProductSpecification> | ProductSpecification | undefined {
    if (locale) {
      return Utils.deepClone(this.specifications[locale] ?? this.specifications[LocaleLanguageMap[locale]] ?? this.specifications.en);
    } else {
      return Utils.deepClone(this.specifications);
    }
  }

  /**
   * Gets the image information model for this line item.
   * @returns The ImageInfoModel instance.
   */
  getImage(): ImageInfoModel {
    return this.primaryImage;
  }

  /**
   * Gets the sub-items (size/quantity breakdown).
   * @returns A copy of the array of SubItems.
   */
  getSubItems(): SubItem[] {
    return Utils.deepClone(this.subItems);
  }

  /**
   * Gets the total quantity for this line item across all sub-items.
   * @returns The total quantity as a number.
   */
  getTotalQuantity(): number {
    return this.total.quantity;
  }

  /**
   * Gets the pricing information model for this line item.
   * @returns An object containing unit price, tiered pricing, tax category, and tax details.
   */
  getPricing() {
    return {
      unitPrice: this.pricing.unitPrice,
      tierPricing: this.pricing.tierPricing,
      taxCategory: this.pricing.taxCategory,
      tax: {
        taxRuleId: this.pricing.tax.taxRuleId,
        taxSystem: this.pricing.tax.taxSystem,
        country: this.pricing.tax.country,
        rate: this.pricing.tax.rate,
        taxSlabs: Utils.deepClone(this.pricing.tax.taxSlabs),
      }
    };
  }

  /**
   * Gets the current state of the line item.
   * @returns The LineItemState enum value.
   */
  getState() {
    return this.state;
  }

  /**
   * Gets the total price for this line item (including all sub-items).
   * @returns An object containing line item totals including subtotal, tax, discounts, and grand total.
   */
  getTotal() {
    return {
      quantity: this.total.quantity,
      subtotal: this.total.subtotal,
      taxableAmount: this.total.taxableAmount,
      taxTotal: this.total.taxTotal,
      discounts: Object.fromEntries(
        Object.entries(this.total.discounts).map(([couponCode, discount]) => [
          couponCode,
          discount,
        ])
      ),
      grandTotal: this.total.grandTotal,
    };
  }

  /**
   * Gets a plain data object representing the line item's details.
   * @returns LineItemData.
   */
  getDetails(): LineItemData {
    return {
      id: this.getId(),
      productKey: this.getProductKey(),
      selectionAttribute: this.getSelectionAttribute(),
      name: this.getName(),
      specifications: this.getSpecifications(),
      primaryImage: this.getImage().getDetails(),
      subItems: this.getSubItems(),
      pricing: {
        unitPrice: this.getPricing().unitPrice.getDetails(),
        tierPricing: this.getPricing().tierPricing.getDetails(),
        taxCategory: this.getPricing().taxCategory,
        tax: this.getPricing().tax
      },
      state: this.getState(),
      total: {
        quantity: this.getTotal().quantity,
        subtotal: this.getTotal().subtotal.getDetails(),
        taxableAmount: this.getTotal().taxableAmount.getDetails(),
        taxTotal: this.getTotal().taxTotal.getDetails(),
        discounts: Object.fromEntries(
          Object.entries(this.getTotal().discounts).map(([couponCode, discount]) => [
            couponCode,
            discount.getDetails(),
          ])
        ),
        grandTotal: this.getTotal().grandTotal.getDetails(),
      }
    };
  }

  /**
   * Adds or updates sub-items (e.g., sizes with quantities) to the line item.
   * If a sub-item with the same size already exists, its quantity is either
   * updated by adding the new quantity or replaced entirely, based on the `addQuantity` flag.
   * Sub-items with a resulting quantity of 0 are removed.
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
    this.subItems = this.subItems.filter(sub => sub.quantity >= 0);
    this.calculateTotals();
  }

  /**
   * Updates the line item with the latest product data (price, image, name, specifications).
   * Validates that the product matches the line item's selection and is active.
   * @param product - The product model to update from.
   * @param cartCountry - The country code for pricing context.
   * @param cartCurrency - The currency code for pricing context.
   * @throws {Error} If product mismatch, inactive, size mismatch, or pricing missing.
   */
  public updateProductData(product: ProductModel, cartCountry: CountryCode, cartCurrency: CurrencyCode): void {
    if (this.productKey !== product.getKey() || !product.validateSelectionAttribute(this.selectionAttribute)) {
      throw new ProductMismatchError();
    } else if (!product.getIsActive()) {
      throw new ProductInactiveError();
    }

    this.subItems.forEach(subItem => {
      if (!product.validateSize(subItem.size)) {
        throw new SizeMismatchError();
      }
    });

    const productPricing = product.getPriceDetails(cartCountry);
    if (!productPricing || productPricing.getBaseUnitPrice().getCurrency() !== cartCurrency) {
      throw new PricingNotFoundError();
    }
    this.name = product.getName();
    this.specifications = product.getSpecifications();
    this.primaryImage = product.getImages(this.selectionAttribute).primary;

    const quantity = this.subItems.reduce((sum, s) => sum + s.quantity, 0);
    const { unitPrice } = productPricing.getApplicableTier(quantity);

    this.pricing = {
      unitPrice: unitPrice,
      tierPricing: productPricing,
      taxCategory: productPricing.getTaxCategory(),
      tax: this.pricing.tax
    }

    this.calculateTotals();
  }

  /**
   * Updates the discounts applied to this line item and recalculates totals.
   * @param appliedDiscounts - List of coupons and their allocated discount amounts.
   */
  public updateDiscounts(appliedDiscounts: { coupon: CouponModel, amount: PriceModel }[]): void {
    let lineItemDiscounts = {} as Record<string, PriceModel>;
    appliedDiscounts.forEach(discount => {
      lineItemDiscounts[discount.coupon.getCode()] = discount.amount;
    });

    this.total.discounts = lineItemDiscounts;
    this.calculateTotals();
  }

  /**
   * Updates the tax rule for this line item and recalculates totals.
   * @param taxRule - The new tax rule to apply.
   * @throws {Error} If the tax rule category does not match the item's tax category.
   */
  public updateTax(taxRule: TaxRuleModel): void {
    if (!taxRule.appliesTo(this.pricing.taxCategory, this.pricing.tax.country)) {
      throw new InvalidTaxRuleError();
    }

    const taxableUnitPrice = this.total.taxableAmount.divide(this.total.quantity);
    this.pricing.tax = {
      taxRuleId: taxRule.getTaxRuleId(),
      taxSystem: taxRule.getTaxSystem(),
      country: taxRule.getCountry(),
      rate: taxRule.getApplicableTaxRate(taxableUnitPrice),
      taxSlabs: taxRule.getSlabs(),
    };
    this.calculateTotals();
  }

  /**
   * Recalculates the line item totals based on current quantity, unit price, discounts, and tax rates.
   */
  public calculateTotals(): void {
    const zero = this.pricing.unitPrice.zero();
    const totalQuantity = this.subItems.reduce((sum, s) => sum + s.quantity, 0);
    const { unitPrice } = this.pricing.tierPricing.getApplicableTier(totalQuantity);
    const subTotal = unitPrice.multiply(totalQuantity);
    const discounts = Object.values(this.total.discounts).reduce((sum, s) => sum.add(s), zero);
    const taxableAmount = subTotal.subtract(discounts);
    const unitTaxbleAmount = taxableAmount.divide(totalQuantity);
    const taxRate = TaxRuleModel.getApplicableTaxRate(unitTaxbleAmount, this.pricing.tax.taxSlabs);
    const taxTotal = taxableAmount.multiply(taxRate).round();
    const grandTotal = subTotal.subtract(discounts).add(taxTotal);

    this.total = {
      quantity: totalQuantity,
      subtotal: subTotal,
      taxableAmount: taxableAmount,
      taxTotal: taxTotal,
      discounts: this.total.discounts,
      grandTotal: grandTotal
    }
  }

  /**
   * Resets the line item's properties to their default empty or initial state.
   * Useful for clearing out line item data without creating a new instance.
   * Recalculates total quantity and price total afterwards (which will be zero).
   */
  clearLineItem(): void {
    const zero = this.pricing.unitPrice.zero()
    this.id = '';
    this.productKey = '';
    this.selectionAttribute = { color: { name: '' } };
    this.name = { en: '' };
    this.primaryImage = new ImageInfoModel({ sources: { original: '' } });
    this.subItems = [];
    this.pricing = {
      unitPrice: zero,
      tierPricing: this.pricing.tierPricing,
      taxCategory: this.pricing.taxCategory,
      tax: this.pricing.tax
    }
    this.total = {
      quantity: 0,
      subtotal: zero,
      taxableAmount: zero,
      taxTotal: zero,
      discounts: {},
      grandTotal: zero
    };
  }
}
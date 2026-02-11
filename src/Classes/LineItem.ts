import Utils from "../Utils";
import { Color, CountryCode, CurrencyCode, LocaleCode, LocalizedString, LocalizedValue } from "./Common";
import CouponModel from "./Coupon";
import { LineItemState, LocaleLanguageMap, TaxSystem } from "./Enum";
import ImageInfoModel, { ImageInfoData } from "./ImageInfo";
import PriceModel, { PriceData } from "./Price";
import ProductModel, { ProductSelectionAttributes, ProductSpecification, SelectionAttributes } from "./Product";
import { TaxRuleData, TaxRuleModel, TaxSlabModel, TaxSlabs } from "./TaxRule";
import { TieredPriceData, TieredPriceModel } from "./TieredPrice";
import {
  DuplicateSizeError,
  ProductMismatchError,
  ProductInactiveError,
  SizeMismatchError,
  PricingNotFoundError,
  InvalidTaxRuleError,
  InvalidLineItemStateError
} from "./Error";
import { CustomFieldAttributes, CustomFieldModel } from "./Base";

export type SubItem = {
  size: string | 'ONESIZE';
  quantity: number;
};

export type LineItemPricing = {
  unitPrice: PriceData;
  tierPricing: TieredPriceData;
  taxCategory: string;
  applicableTaxRule: TaxRuleData[];
};

export type LineItemTaxBreakdown = {
  rate: number;                    // 0.09 for 9%
  taxableUnitPrice: PriceData;       // effectiveUnitPrice used for calculation
  taxPerUnit: PriceData;           // tax on single unit
  amount: PriceData;               // taxPerUnit × quantity (total tax)
  system: TaxSystem;
  subSystem: string;
};

export type LineItemTaxBreakdownModel = {
  rate: number;
  taxableUnitPrice: PriceModel;
  taxPerUnit: PriceModel;
  amount: PriceModel;
  system: TaxSystem;
  subSystem: string;
};

export type LineItemTotals = {
  quantity: number;
  unitPrice: PriceData;              // original unit price (from tier pricing)
  subtotal: PriceData;               // unitPrice × quantity
  discounts: Record<string, PriceData>; // couponCode -> discount mapping
  totalDiscount: PriceData;          // sum of all discounts
  netUnitPrice: PriceData;           // unit price after discounts
  netSubtotal: PriceData;            // subtotal - totalDiscount (taxable amount)
  taxBreakdown: Record<string, LineItemTaxBreakdown>;
  taxTotal: PriceData;               // sum of all tax amounts
  grandTotal: PriceData;             // effectiveSubtotal + taxTotal
};

export type LineItemTotalsModel = {
  quantity: number;
  unitPrice: PriceModel;
  subtotal: PriceModel;
  discounts: Record<string, PriceModel>;
  totalDiscount: PriceModel;
  netUnitPrice: PriceModel;
  netSubtotal: PriceModel;
  taxBreakdown: Record<string, LineItemTaxBreakdownModel>;
  taxTotal: PriceModel;
  grandTotal: PriceModel;
};

export type LineItemAttributes = CustomFieldAttributes & {
  id: string;

  productKey: string;
  selectionAttributes: SelectionAttributes;

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
export default class LineItemModel extends CustomFieldModel {
  protected id: string;
  protected productKey: string;
  protected selectionAttributes: SelectionAttributes;

  protected name: LocalizedString;
  protected specifications: LocalizedValue<ProductSpecification>;
  protected primaryImage: ImageInfoModel;
  protected subItems: SubItem[];
  protected pricing: {
    unitPrice: PriceModel;
    tierPricing: TieredPriceModel;
    taxCategory: string;
    applicableTaxRule: TaxRuleModel[];
  };

  protected state: LineItemState;
  protected total: LineItemTotalsModel;

  /**
   * Creates an instance of LineItemModel.
   * @param data - The initial line item attributes.
   */
  constructor(data: LineItemAttributes) {
    super(data);
    this.id = data.id;
    this.productKey = data.productKey;
    this.selectionAttributes = Utils.deepClone(data.selectionAttributes);

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
      applicableTaxRule: data.pricing.applicableTaxRule.map(rule => new TaxRuleModel(rule)),
    }

    this.state = data.state ?? LineItemState.INITIAL;

    this.total = {
      quantity: data.total.quantity,
      unitPrice: new PriceModel(data.total.unitPrice),
      subtotal: new PriceModel(data.total.subtotal),
      discounts: Object.fromEntries(
        Object.entries(data.total.discounts).map(([couponCode, discount]) => [
          couponCode,
          new PriceModel(discount),
        ])
      ),
      totalDiscount: new PriceModel(data.total.totalDiscount),
      netUnitPrice: new PriceModel(data.total.netUnitPrice),
      netSubtotal: new PriceModel(data.total.netSubtotal),
      taxBreakdown: Object.fromEntries(
        Object.entries(data.total.taxBreakdown).map(([taxRuleId, taxBreakdown]) => [
          taxRuleId,
          {
            rate: taxBreakdown.rate,
            taxableUnitPrice: new PriceModel(taxBreakdown.taxableUnitPrice),
            taxPerUnit: new PriceModel(taxBreakdown.taxPerUnit),
            amount: new PriceModel(taxBreakdown.amount),
            system: taxBreakdown.system,
            subSystem: taxBreakdown.subSystem
          }
        ])
      ),
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
  getSelectionAttributes(): SelectionAttributes {
    return Utils.deepClone(this.selectionAttributes);
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
      applicableTaxRule: [...this.pricing.applicableTaxRule],
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
  getTotal(): LineItemTotalsModel {
    return {
      quantity: this.total.quantity,
      unitPrice: this.total.unitPrice,
      subtotal: this.total.subtotal,
      discounts: Object.fromEntries(
        Object.entries(this.total.discounts).map(([couponCode, discount]) => [
          couponCode,
          discount,
        ])
      ),
      totalDiscount: this.total.totalDiscount,
      netUnitPrice: this.total.netUnitPrice,
      netSubtotal: this.total.netSubtotal,
      taxBreakdown: Object.fromEntries(
        Object.entries(this.total.taxBreakdown).map(([taxRuleId, taxBreakdown]) => [
          taxRuleId,
          {
            rate: taxBreakdown.rate,
            taxableUnitPrice: taxBreakdown.taxableUnitPrice,
            taxPerUnit: taxBreakdown.taxPerUnit,
            amount: taxBreakdown.amount,
            system: taxBreakdown.system,
            subSystem: taxBreakdown.subSystem
          }
        ])
      ),
      taxTotal: this.total.taxTotal,
      grandTotal: this.total.grandTotal,
    };
  }

  /**
   * Gets a plain data object representing the line item's details.
   * @returns LineItemData.
   */
  getDetails(): LineItemData {
    const pricing = this.getPricing();
    const total = this.getTotal();
    return {
      id: this.getId(),
      productKey: this.getProductKey(),
      selectionAttributes: this.getSelectionAttributes(),
      name: this.getName(),
      specifications: this.getSpecifications(),
      primaryImage: this.getImage().getDetails(),
      subItems: this.getSubItems(),
      pricing: {
        unitPrice: pricing.unitPrice.getDetails(),
        tierPricing: pricing.tierPricing.getDetails(),
        taxCategory: pricing.taxCategory,
        applicableTaxRule: pricing.applicableTaxRule.map(rule => rule.getDetails()),
      },
      state: this.getState(),
      total: {
        quantity: total.quantity,
        unitPrice: total.unitPrice.getDetails(),
        subtotal: total.subtotal.getDetails(),
        discounts: Object.fromEntries(
          Object.entries(total.discounts).map(([couponCode, discount]) => [
            couponCode,
            discount.getDetails(),
          ])
        ),
        totalDiscount: total.totalDiscount.getDetails(),
        netUnitPrice: total.netUnitPrice.getDetails(),
        netSubtotal: total.netSubtotal.getDetails(),
        taxBreakdown: Object.fromEntries(
          Object.entries(total.taxBreakdown).map(([taxRuleId, taxBreakdown]) => [
            taxRuleId,
            {
              rate: taxBreakdown.rate,
              taxableUnitPrice: taxBreakdown.taxableUnitPrice.getDetails(),
              taxPerUnit: taxBreakdown.taxPerUnit.getDetails(),
              amount: taxBreakdown.amount.getDetails(),
              system: taxBreakdown.system,
              subSystem: taxBreakdown.subSystem
            }
          ])
        ),
        taxTotal: total.taxTotal.getDetails(),
        grandTotal: total.grandTotal.getDetails(),
      },
      customFields: this.getAllCustomFields()
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
    this.subItems = this.subItems.filter(sub => sub.quantity > 0);
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
    if (this.productKey !== product.getKey() || !product.validateSelectionAttribute(this.selectionAttributes)) {
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
    this.primaryImage = product.getImages(this.selectionAttributes).primary;

    const quantity = this.subItems.reduce((sum, s) => sum + s.quantity, 0);
    const { unitPrice } = productPricing.getApplicableTier(quantity);

    this.pricing = {
      unitPrice: unitPrice,
      tierPricing: productPricing,
      taxCategory: productPricing.getTaxCategory(),
      applicableTaxRule: this.pricing.applicableTaxRule
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
  public updateTax(taxRules: TaxRuleModel[]): void {
    taxRules.forEach(taxRule => {
      if (!taxRule.appliesTo(this.pricing.taxCategory, taxRule.getTaxCountry())) {
        throw new InvalidTaxRuleError();
      }
    });

    // Remove the old taxableUnitPrice calculation - no longer needed
    this.pricing.applicableTaxRule = taxRules;
    this.calculateTotals();
  }

  /**
   * Recalculates the line item totals based on current quantity, unit price, discounts, and tax rates.
   */
  public calculateTotals(): void {
    const zero = this.pricing.unitPrice.zero();
    const totalQuantity = this.subItems.reduce((sum, s) => sum + s.quantity, 0);

    if (this.state === LineItemState.CANCELLED) {
      this.total = {
        quantity: 0,
        unitPrice: zero,
        subtotal: zero,
        discounts: {},
        totalDiscount: zero,
        netUnitPrice: zero,
        netSubtotal: zero,
        taxBreakdown: {},
        taxTotal: zero,
        grandTotal: zero
      };
      return;
    }

    const { unitPrice } = this.pricing.tierPricing.getApplicableTier(totalQuantity);
    const subTotal = unitPrice.multiply(totalQuantity);
    const totalDiscount = Object.values(this.total.discounts).reduce((sum, s) => sum.add(s), zero);
    const netSubtotal = subTotal.subtract(totalDiscount);
    const netUnitPrice = totalQuantity > 0 ? netSubtotal.divide(totalQuantity) : zero;

    // Calculate tax for each applicable rule
    const taxBreakdown: Record<string, LineItemTaxBreakdownModel> = {};
    let taxTotal = zero;
    this.pricing.applicableTaxRule.forEach(taxRule => {
      const rate = taxRule.getApplicableTaxRate(netUnitPrice);
      const taxPerUnit = taxRule.calculateTax(netUnitPrice);
      const amount = taxPerUnit.multiply(totalQuantity).round();
      taxBreakdown[taxRule.getTaxRuleId()] = {
        rate: rate,
        taxableUnitPrice: netUnitPrice,
        taxPerUnit: taxPerUnit,
        amount: amount,
        system: taxRule.getTaxSystem(),
        subSystem: taxRule.getTaxSubSystem()
      };
      taxTotal = taxTotal.add(amount);
    });

    const grandTotal = netSubtotal.add(taxTotal);

    this.total = {
      quantity: totalQuantity,
      unitPrice: unitPrice,
      subtotal: subTotal,
      discounts: this.total.discounts,
      totalDiscount: totalDiscount,
      netUnitPrice: netUnitPrice,
      netSubtotal: netSubtotal,
      taxBreakdown: taxBreakdown,
      taxTotal: taxTotal,
      grandTotal: grandTotal
    };
  }

  /**
   * Updates the line item's state.
   * @param newState 
   */
  public updateState(newState: LineItemState): void {
    if (this.state in LineItemState) {
      if (this.state !== newState) {
        this.state = newState;
      }
    } else {
      throw new InvalidLineItemStateError(newState);
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
    this.selectionAttributes = { color: { name: '' } };
    this.name = { en: '' };
    this.primaryImage = new ImageInfoModel({ sources: { original: '' } });
    this.subItems = [];
    this.pricing = {
      unitPrice: zero,
      tierPricing: this.pricing.tierPricing,
      taxCategory: this.pricing.taxCategory,
      applicableTaxRule: []
    }
    this.total = {
      quantity: 0,
      unitPrice: zero,
      subtotal: zero,
      discounts: {},
      totalDiscount: zero,
      netUnitPrice: zero,
      netSubtotal: zero,
      taxBreakdown: {},
      taxTotal: zero,
      grandTotal: zero
    };
  }
}

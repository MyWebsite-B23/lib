import BaseModel, { BaseAttributes, BaseData } from "./Base";
import AddressModel, { AddressData } from "./Address";
import LineItemModel, { LineItemData, LineItemTaxBreakdown, LineItemTaxBreakdownModel } from "./LineItem";
import { CountryCode, CurrencyCode, LocaleCode, ShippingDetails } from "./Common";
import PriceModel, { PriceData } from "./Price";
import CouponModel, { CouponCategory, CouponData, CouponType } from "./Coupon";
import Utils from "../Utils";
import { ChargeImpact, ChargeType, LineItemState, TaxSystem } from "./Enum";
import ChargeModel, { ChargeData, ChargeTaxBreakdownModel } from "./Charge";

/**
 * Breakdown of a specific tax system (e.g., GST, VAT) for the entire container.
 * Groups taxes by system and then by specific rule/subsystem.
 */
export type TaxSystemBreakdown = {
  /** Name of the tax system (e.g., GST) */
  system: TaxSystem;
  /** Total tax amount collected for this system across all line items and charges */
  totalAmount: PriceData;
  /** Detailed breakdown by rule/subsystem to total tax amount (e.g., CGST, SGST) */
  subSystems: Record<string, PriceData>;
};

/**
 * Internal model for tax system breakdown using PriceModel instances.
 */
export type TaxSystemBreakdownModel = {
  system: TaxSystem;
  totalAmount: PriceModel;
  subSystems: Record<string, PriceModel>;
};

export type ShoppingContainerTaxBreakdownModel = Record<string, TaxSystemBreakdownModel>;

/**
 * Comprehensive totals for a shopping container, logically grouped by source.
 */
export type ShoppingContainerTotal = {
  // --- Item Totals ---
  /** Sum of all line item prices before any discounts or taxes */
  lineItemSubtotal: PriceData;
  /** Total item subtotal after item-level discounts have been applied (taxable base for items) */
  netLineItemSubtotal: PriceData;
  /** Total tax collected specifically from line items */
  lineItemTaxTotal: PriceData;
  /** Granular tax breakdown for all line items */
  lineItemTaxBreakdown: Record<string, TaxSystemBreakdown>;

  // --- Charge Totals ---
  /** Sum of pre-discount chargeAmount for additive charges (tax-inclusive) */
  additiveCharges: PriceData;
  /** Sum of post-discount netChargeAmount for additive charges – final payable (tax-inclusive) */
  netAdditiveCharges: PriceData;
  /** Tax reverse-calculated from additive charges only */
  additiveChargesTaxTotal: PriceData;
  /** Granular tax breakdown from additive charges */
  additiveChargesTaxBreakdown: Record<string, TaxSystemBreakdown>;

  /** Sum of post-discount netChargeAmount for subtractive charges – absolute amount to subtract */
  adjustmentCharges:  PriceData;

  /** Pre-discount shipping gross (tax-inclusive, part of additive charges) */
  shippingCharges: PriceData;
  /** Shipping cost after any shipping-specific discounts */
  netShippingCharges: PriceData;

  // --- Aggregate Totals ---
  /** Combined total tax (lineItemTaxTotal + chargeTaxTotal) */
  taxTotal: PriceData;
  /** Combined granular tax breakdown for the entire container */
  taxBreakdown: Record<string, TaxSystemBreakdown>;
  /** Sum of all coupon discounts applied to the container */
  discountTotal: PriceData;
  /** Map of applied coupon codes to their calculated discount amounts */
  discountBreakdown: Record<string, PriceData>;
  /** Final total amount to be paid (NetSubtotal + ChargesTotal + TaxTotal - (any remaining discounts)) */
  grandTotal: PriceData;
};

/**
 * Internal model version of ShoppingContainerTotal using PriceModel instances.
 */
export type ShoppingContainerTotalModel = {
  lineItemSubtotal: PriceModel;
  netLineItemSubtotal: PriceModel;
  lineItemTaxTotal: PriceModel;
  lineItemTaxBreakdown: Record<string, TaxSystemBreakdownModel>;

  additiveCharges: PriceModel;
  netAdditiveCharges: PriceModel;
  additiveChargesTaxTotal: PriceModel;
  additiveChargesTaxBreakdown: Record<string, TaxSystemBreakdownModel>;

  adjustmentCharges: PriceModel;

  shippingCharges: PriceModel;
  netShippingCharges: PriceModel;

  taxTotal: PriceModel;
  taxBreakdown: Record<string, TaxSystemBreakdownModel>;
  discountTotal: PriceModel;
  discountBreakdown: Record<string, PriceModel>;
  grandTotal: PriceModel;
};


export type BaseShoppingContainerAttributes = BaseAttributes & {
  id: string;
  customerId?: string;
  customerEmail?: string;
  anonymousId?: string;
  lineItems: LineItemData[];
  charges: ChargeData[];
  shippingDetails: ShippingDetails | null;
  shippingAddress?: AddressData | null;
  billingAddress?: AddressData | null;
  coupons: CouponData[];
  total: ShoppingContainerTotal;
  country: CountryCode;
  currency: CurrencyCode;
  locale: LocaleCode;
};

export type BaseShoppingContainerData = BaseShoppingContainerAttributes & BaseData


/**
 * Abstract base class for shopping-related containers like carts and orders.
 * Manages common elements such as line items, addresses, coupons, and totals.
 */
export default abstract class BaseShoppingContainerModel extends BaseModel {
  protected id: string;
  protected customerId?: string;
  protected customerEmail?: string;
  protected anonymousId?: string;
  protected lineItems: LineItemModel[];
  protected charges: ChargeModel[];
  protected shippingDetails: ShippingDetails | null;
  protected shippingAddress: AddressModel | null;
  protected billingAddress: AddressModel | null;

  // CouponsCodes
  protected coupons: CouponModel[];

  // Cart Totals
  protected total: ShoppingContainerTotalModel;

  protected country: CountryCode;
  protected currency: CurrencyCode;
  protected locale: LocaleCode;

  /**
   * Creates an instance of BaseShoppingContainerModel.
   * Initializes common properties and calculates initial base totals.
   * @param data - The initial attributes for the shopping container.
   * @param date - Optional date object for setting creation/modification times (defaults to now).
   */
  constructor(data: BaseShoppingContainerAttributes, date: Date = new Date()) {
    super(data, date);
    this.id = data.id;
    this.customerId = data.customerId;
    this.customerEmail = data.customerEmail;
    this.anonymousId = data.anonymousId;
    this.country = data.country;
    this.currency = data.currency;
    this.locale = data.locale;
    this.lineItems = (data.lineItems ?? []).map(item => new LineItemModel(item));
    this.charges = (data.charges ?? []).map(charge => new ChargeModel(charge));
    this.billingAddress = data.billingAddress ? new AddressModel(data.billingAddress, date) : null;
    this.shippingAddress = data.shippingAddress ? new AddressModel(data.shippingAddress, date) : null;
    this.coupons = (data.coupons ?? []).map(coupon => new CouponModel(coupon));

    this.shippingDetails = data.shippingDetails ? Utils.deepClone(data.shippingDetails) : null;

    this.total = {
      lineItemSubtotal: new PriceModel(data.total.lineItemSubtotal),
      netLineItemSubtotal: new PriceModel(data.total.netLineItemSubtotal),
      lineItemTaxTotal: new PriceModel(data.total.lineItemTaxTotal),
      lineItemTaxBreakdown: this.mapTaxBreakdown(data.total.lineItemTaxBreakdown),

      additiveCharges: new PriceModel(data.total.additiveCharges),
      netAdditiveCharges: new PriceModel(data.total.netAdditiveCharges),
      additiveChargesTaxTotal: new PriceModel(data.total.additiveChargesTaxTotal),

      additiveChargesTaxBreakdown: this.mapTaxBreakdown(data.total.additiveChargesTaxBreakdown),
      adjustmentCharges: new PriceModel(data.total.adjustmentCharges),
      shippingCharges: new PriceModel(data.total.shippingCharges),
      netShippingCharges: new PriceModel(data.total.netShippingCharges),

      discountTotal: new PriceModel(data.total.discountTotal),
      discountBreakdown: Object.fromEntries(
        Object.entries(data.total.discountBreakdown).map(([key, value]) => [key, new PriceModel(value)])
      ),

      taxTotal: new PriceModel(data.total.taxTotal),
      taxBreakdown: this.mapTaxBreakdown(data.total.taxBreakdown),
      grandTotal: new PriceModel(data.total.grandTotal),
    };
  }

  private mapTaxBreakdown(breakdown: Record<string, TaxSystemBreakdown>): Record<string, TaxSystemBreakdownModel> {
    return Object.fromEntries(
      Object.entries(breakdown || {}).map(([systemKey, systemValue]) => [
        systemKey,
        {
          system: systemValue.system,
          totalAmount: new PriceModel(systemValue.totalAmount),
          subSystems: Object.fromEntries(
            Object.entries(systemValue.subSystems).map(([subKey, subValue]) => [
              subKey,
              new PriceModel(subValue)
            ])
          )
        }
      ])
    );
  }

  private serializeTaxBreakdown(breakdown: Record<string, TaxSystemBreakdownModel>): Record<string, TaxSystemBreakdown> {
    return Object.fromEntries(
      Object.entries(breakdown || {}).map(([systemKey, systemValue]) => [
        systemKey,
        {
          system: systemValue.system,
          totalAmount: systemValue.totalAmount.getDetails(),
          subSystems: Object.fromEntries(
            Object.entries(systemValue.subSystems).map(([subKey, subValue]) => [
              subKey,
              subValue.getDetails()
            ])
          )
        }
      ])
    );
  }

  /**
   * Gets the unique identifier for this shopping container (cart ID or order ID).
   * @returns The ID string.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Gets the customer ID associated with this container, if available.
   * @returns The customer ID string, or undefined.
   */
  public getCustomerId(): string | undefined {
    return this.customerId;
  }

  /**
   * Gets the customer email associated with this container, if available.
   * @returns The customer email string, or undefined.
   */
  public getCustomerEmail(): string | undefined {
    return this.customerEmail;
  }

  /**
   * Gets the anonymous user ID associated with this container, if available.
   * @returns The anonymous ID string, or undefined.
   */
  public getAnonymousId(): string | undefined {
    return this.anonymousId;
  }

  /**
   * Gets a defensive copy of the line items in the container.
   * Each item is a new LineItemModel instance created from the original's details.
   * @returns An array of LineItemModel instances.
   */
  public getLineItems(): LineItemModel[] {
    // Return new instances to prevent modification of internal state
    return this.lineItems.map(item => new LineItemModel(item.getDetails()));
  }

  /**
   * Gets current number of line items in the container.
   * @returns The count of line items.
   */
  public getLineItemsCount(): number {
    return this.lineItems.length;
  }

  /**
   * Gets a defensive copy of the charges in the container.
   * @returns An array of ChargeModel instances.
   */
  public getCharges(): ChargeModel[] {
    return this.charges.map(charge => new ChargeModel(charge.getDetails()));
  }

  /**
   * Adds a new charge to the container and recalculates totals.
   * @param charge - The charge to add.
   */
  public addCharge(charge: ChargeModel): void {
    this.charges.push(charge);
    this.calculateTotals();
  }

  /**
   * Clears all charges from the container and recalculates totals.
   */
  public clearCharges(): void {
    this.charges = [];
    this.calculateTotals();
  }

  /**
   * Gets a copy of the shipping details associated with the container.
   * @returns A ShippingDetails object, or null if none are set.
   */
  public getShippingDetails(): ShippingDetails | null {
    return this.shippingDetails ? Utils.deepClone(this.shippingDetails) : null;
  }

  /**
   * Gets a defensive copy of the shipping address associated with the container.
   * Returns a new AddressModel instance created from the original's details.
   * @returns An AddressModel instance, or null if no shipping address is set.
   */
  public getShippingAddress(): AddressModel | null {
    return this.shippingAddress ? new AddressModel(this.shippingAddress.getDetails()) : null;
  }

  /**
   * Checks if a shipping address is associated with this container.
   * @returns True if a shipping address is set, false otherwise.
   */
  public hasShippingAddress(): boolean {
    return !!this.shippingAddress;
  }

  /**
   * Checks if a billing address is associated with this container.
   * @returns True if a billing address is set, false otherwise.
   */
  public hasBillingAddress(): boolean {
    return !!this.billingAddress;
  }

  /**
   * Gets a defensive copy of the billing address associated with the container.
   * Returns a new AddressModel instance created from the original's details.
   * @returns An AddressModel instance, or null if no billing address is set.
   */
  public getBillingAddress(): AddressModel | null {
    return this.billingAddress ? new AddressModel(this.billingAddress.getDetails()) : null;
  }

  /**
   * Gets a defensive copy of the coupons applied to the container.
   * Each item is a new CouponModel instance created from the original's details.
   * @returns An array of CouponModel instances.
   */
  public getCoupons(): CouponModel[] {
    return [...this.coupons];
  }

  /**
   * Gets the country code associated with this container.
   * @returns The CountryCode enum value.
   */
  public getCountry(): CountryCode {
    return this.country;
  }

  /**
   * Gets the currency code associated with this container.
   * @returns The CurrencyCode enum value.
   */
  public getCurrency(): CurrencyCode {
    return this.currency;
  }

  /**
   * Gets the locale code associated with this container.
   * @returns The LocaleCode enum value.
   */
  public getLocale(): LocaleCode {
    return this.locale;
  }

  /**
   * Gets a defensive copy of the calculated totals for the container.
   * @returns An object containing shipping, subtotal, coupon, and grand totals.
   */
  public getTotal() {
    return {
      lineItemSubtotal: this.total.lineItemSubtotal,
      netLineItemSubtotal: this.total.netLineItemSubtotal,
      lineItemTaxTotal: this.total.lineItemTaxTotal,
      lineItemTaxBreakdown: Object.fromEntries(
        Object.entries(this.total.lineItemTaxBreakdown).map(([systemKey, systemValue]) => [
          systemKey,
          {
            system: systemValue.system,
            totalAmount: systemValue.totalAmount,
            subSystems: { ...systemValue.subSystems }
          }
        ])
      ),
      additiveCharges: this.total.additiveCharges,
      netAdditiveCharges : this.total.netAdditiveCharges,
      additiveChargesTaxTotal: this.total.additiveChargesTaxTotal,
      additiveChargesTaxBreakdown: Object.fromEntries(
        Object.entries(this.total.additiveChargesTaxBreakdown).map(([systemKey, systemValue]) => [
          systemKey,
          {
            system: systemValue.system,
            totalAmount: systemValue.totalAmount,
            subSystems: { ...systemValue.subSystems }
          }
        ])
      ),
      adjustmentCharges: this.total.adjustmentCharges,
      shippingCharges: this.total.shippingCharges,
      netShippingCharges: this.total.netShippingCharges,
      discountBreakdown: { ...this.total.discountBreakdown },
      discountTotal: this.total.discountTotal,
      taxTotal: this.total.taxTotal,
      taxBreakdown: Object.fromEntries(
        Object.entries(this.total.taxBreakdown).map(([systemKey, systemValue]) => [
          systemKey,
          {
            system: systemValue.system,
            totalAmount: systemValue.totalAmount,
            subSystems: { ...systemValue.subSystems }
          }
        ])
      ),
      grandTotal: this.total.grandTotal,
    };
  }

  /**
   * Gets a plain data object representing the shopping container's current state.
   * Includes details from the base model and specific container properties.
   * @returns BaseShoppingContainerData object suitable for serialization or API responses.
   */
  getDetails(): BaseShoppingContainerData {
    const totals = this.getTotal();
    return {
      ...super.getDetails(),
      id: this.getId(),
      customerId: this.getCustomerId(),
      customerEmail: this.getCustomerEmail(),
      anonymousId: this.getAnonymousId(),
      lineItems: this.getLineItems().map(item => item.getDetails()),
      charges: this.getCharges().map(charge => charge.getDetails()),
      shippingDetails: this.getShippingDetails(),
      shippingAddress: this.getShippingAddress()?.getDetails() || null,
      billingAddress: this.getBillingAddress()?.getDetails() || null,
      coupons: this.getCoupons().map(coupon => coupon.getDetails()),
      total: {
        // Item Totals
        lineItemSubtotal: totals.lineItemSubtotal.getDetails(),
        netLineItemSubtotal: totals.netLineItemSubtotal.getDetails(),
        lineItemTaxTotal: totals.lineItemTaxTotal.getDetails(),
        lineItemTaxBreakdown: this.serializeTaxBreakdown(totals.lineItemTaxBreakdown),

        // Charge Totals
        additiveCharges: totals.additiveCharges.getDetails(),
        netAdditiveCharges: totals.netAdditiveCharges.getDetails(),
        additiveChargesTaxTotal: totals.additiveChargesTaxTotal.getDetails(),
        additiveChargesTaxBreakdown: this.serializeTaxBreakdown(totals.additiveChargesTaxBreakdown),

        adjustmentCharges: totals.adjustmentCharges.getDetails(),

        shippingCharges: totals.shippingCharges.getDetails(),
        netShippingCharges: totals.netShippingCharges.getDetails(),

        // Aggregate Totals
        discountTotal: totals.discountTotal.getDetails(),
        discountBreakdown: Object.fromEntries(
          Object.entries(totals.discountBreakdown).map(([key, value]) => [key, value.getDetails()])
        ),
        taxTotal: totals.taxTotal.getDetails(),
        taxBreakdown: this.serializeTaxBreakdown(totals.taxBreakdown),
        grandTotal: totals.grandTotal.getDetails(),
      },
      country: this.getCountry(),
      currency: this.getCurrency(),
      locale: this.getLocale(),
    };
  }

  /**
   * Recalculates the total costs for the shopping container.
   * This includes summing line items, calculating shipping, applying coupons, and computing taxes.
   */
  public calculateTotals(): void {
    const zero = new PriceModel({ amount: 0, currency: this.currency });
    
    // 1. Calculate LineItem subtotals and Shipping Cost
    const filteredLineItems = this.lineItems.filter(lineitem => lineitem.getState() !== LineItemState.CANCELLED);
    const lineItemSubtotal = filteredLineItems.reduce((total, lineItem) => total.add(lineItem.getTotal().subtotal), zero);
    const shippingCharges = this.charges
      .filter(charge => charge.getType() === ChargeType.SHIPPING)
      .reduce((total, charge) => total.add(charge.getTotal().chargeAmount), zero);

    // 1.1 Assign lineitemSubTotal and shipping charges to total, which will be used for coupon calculations
    this.total.lineItemSubtotal = lineItemSubtotal;
    this.total.shippingCharges = shippingCharges;

    // 2. Calculate coupon values based on gross subtotal & shipping
    let discountTotal = zero;
    let discountBreakdown: Record<string, PriceModel> = {};
    let nonShippingCouponTotal: Record<string, PriceModel> = {};
    this.coupons.forEach(coupon => {
      const couponValue = coupon.calculateApplicableCouponDiscount(lineItemSubtotal, shippingCharges, this.country, this.currency);
      discountTotal = discountTotal.add(couponValue);
      discountBreakdown[coupon.getCode()] = couponValue;
      if (coupon.getCategory() !== CouponCategory.SHIPPING) {
        nonShippingCouponTotal[coupon.getCode()] = couponValue;
      }
    })

    // 2.1. Assign discount total and breakdown to total
    this.total.discountTotal = discountTotal;
    this.total.discountBreakdown = discountBreakdown;

    // 3. Apply discounts at lineitem and shipping charges
    this.applyDiscountsInLineItem(nonShippingCouponTotal);

    const shippingCoupon = this.coupons.find(coupon => coupon.getCategory() === CouponCategory.SHIPPING);
    if(shippingCoupon) {
      this.applyDiscountsInShippingCharges({[shippingCoupon.getCode()] : discountBreakdown[shippingCoupon.getCode()] || zero});
    } else {
      // If no shipping coupon, ensure any previous discounts on shipping charges are cleared
      this.applyDiscountsInShippingCharges({});
    }

    // 3.1 Calculate net lineitemSubtotal and net shipping after discount
    const netLineItemSubtotal = this.lineItems.reduce((total, lineItem) => total.add(lineItem.getTotal().netSubtotal), zero);
    const netShippingCharges = this.charges
      .filter(charge => charge.getType() === ChargeType.SHIPPING)
      .reduce((total, charge) => total.add(charge.getTotal().grandTotal), zero);

    // 3.2 Assign net lineitemSubtotal and net shipping to total
    this.total.netLineItemSubtotal = netLineItemSubtotal;
    this.total.netShippingCharges = netShippingCharges;

    // 4. Calculate charges and net charges after discount
    const additiveCharges = this.charges
      .filter(charge => charge.getImpact() === ChargeImpact.ADD)
      .reduce((total, charge) => total.add(charge.getTotal().chargeAmount), zero);
    const netAdditiveCharges = this.charges
      .filter(charge => charge.getImpact() === ChargeImpact.ADD)
      .reduce((total, charge) => total.add(charge.getTotal().grandTotal), zero);
    const adjustmentCharges = this.charges
      .filter(charge => charge.getImpact() === ChargeImpact.SUBTRACT)
      .reduce((total, charge) => total.add(charge.getTotal().grandTotal), zero);

    // 5. Aggregate Taxes & Grand Total from all items and charges
    let taxTotal = zero;
    let lineItemTaxTotal = zero;
    let additiveChargesTaxTotal = zero;

    const taxBreakdown: ShoppingContainerTaxBreakdownModel = {};
    const lineItemTaxBreakdown: ShoppingContainerTaxBreakdownModel = {};
    const additiveChargesTaxBreakdown: ShoppingContainerTaxBreakdownModel = {};

    // Helper to merge tax breakdowns into hierarchical structure
    const mergeTax = (
      sourceBreakdown: Record<string, LineItemTaxBreakdownModel | ChargeTaxBreakdownModel>,
      targetBreakdown: ShoppingContainerTaxBreakdownModel
    ) => {
      Object.entries(sourceBreakdown).forEach(([ruleId, breakdown]) => {
        const system = breakdown.system;
        const subsystem = breakdown.subSystem;

        // Populate Target Breakdown
        if (!targetBreakdown[system]) {
          targetBreakdown[system] = { system, totalAmount: zero, subSystems: {} };
        }
        if (!targetBreakdown[system].subSystems[subsystem]) {
          targetBreakdown[system].subSystems[subsystem] = breakdown.taxAmount;
        } else {
          targetBreakdown[system].subSystems[subsystem] = targetBreakdown[system].subSystems[subsystem].add(breakdown.taxAmount);
        }
        targetBreakdown[system].totalAmount = targetBreakdown[system].totalAmount.add(breakdown.taxAmount);

        // Populate Combined taxBreakdown
        if (!taxBreakdown[system]) {
          taxBreakdown[system] = { system, totalAmount: zero, subSystems: {} };
        }
        if (!taxBreakdown[system].subSystems[subsystem]) {
          taxBreakdown[system].subSystems[subsystem] = breakdown.taxAmount;
        } else {
          taxBreakdown[system].subSystems[subsystem] = taxBreakdown[system].subSystems[subsystem].add(breakdown.taxAmount);
        }
        taxBreakdown[system].totalAmount = taxBreakdown[system].totalAmount.add(breakdown.taxAmount);
      });
    };

    // 5.1 Merge line item taxes
    filteredLineItems.forEach(lineItem => {
      const lineItemTaxes = lineItem.getTotal().taxBreakdown;
      if (lineItemTaxes) {
        mergeTax(lineItemTaxes, lineItemTaxBreakdown);
        mergeTax(lineItemTaxes, taxBreakdown);
        lineItemTaxTotal = lineItemTaxTotal.add(lineItem.getTotal().taxTotal);
      }
    });

    // 5.2 Merge charge taxes
    this.charges.forEach(charge => {
      const chargeTaxes = charge.getTotal().taxBreakdown;
      if (chargeTaxes) {
        mergeTax(chargeTaxes, additiveChargesTaxBreakdown);
        mergeTax(chargeTaxes, taxBreakdown);
        additiveChargesTaxTotal = additiveChargesTaxTotal.add(charge.getTotal().taxTotal);
      }
    });

    // 5.3 Calculate total tax
    taxTotal = lineItemTaxTotal.add(additiveChargesTaxTotal);

    // 6. Final Grand Total: netLineItemSubtotal + lineItemTaxTotal + netAdditiveCharges (includes netShippingCharges) - adjustmentCharges
    const grandTotal = netLineItemSubtotal.add(lineItemTaxTotal).add(netAdditiveCharges).subtract(adjustmentCharges);


    // 7. Reconstruct total object
    this.total = {
      lineItemSubtotal: lineItemSubtotal,
      netLineItemSubtotal: netLineItemSubtotal,
      lineItemTaxTotal: lineItemTaxTotal,
      lineItemTaxBreakdown: lineItemTaxBreakdown,

      additiveCharges: additiveCharges,
      netAdditiveCharges: netAdditiveCharges,
      additiveChargesTaxTotal: additiveChargesTaxTotal,
      additiveChargesTaxBreakdown: additiveChargesTaxBreakdown,

      adjustmentCharges: adjustmentCharges,
      shippingCharges: shippingCharges,
      netShippingCharges: netShippingCharges,

      discountTotal: discountTotal,
      discountBreakdown: discountBreakdown,
      taxTotal: taxTotal,
      taxBreakdown: taxBreakdown,
      grandTotal: grandTotal,
    };
  }

  /**
   * Updates the shipping details and recalculates the totals.
   * @param shippingDetails - The new shipping details to apply.
   */
  public updateShippingDetails(shippingDetails: ShippingDetails): void {
    this.shippingDetails = shippingDetails;
  }

  /**
   * Applies a list of coupons to the shopping container.
   * Filters out invalid coupons, separates shipping and non-shipping coupons,
   * and distributes discounts to line items.
   * @param applicableCoupons - The list of coupons to attempt to apply.
   */
  public applyCoupons(applicableCoupons: CouponModel[]): void {
    //Apply coupons
    const shippingCoupons = applicableCoupons.filter(coupon => coupon.getCategory() === CouponCategory.SHIPPING);
    const otherCoupons = applicableCoupons.filter(coupon => coupon.getCategory() !== CouponCategory.SHIPPING);

    this.coupons = [];
    this.total.discountTotal = this.total.lineItemSubtotal.zero();
    this.total.discountBreakdown = {};
    // Apply non shipping coupons
    otherCoupons.length && this.applyNonShippingCoupons(otherCoupons);
    this.applyDiscountsInLineItem(this.total.discountBreakdown);

    // Apply shipping coupons
    shippingCoupons.length && this.applyShippingCoupons(shippingCoupons);

    this.calculateTotals();
  }

  /**
   * Distributes the total discount amount among the line items.
   * @param couponTotal - A record of coupon codes and their calculated discount amounts.
   */
  private applyDiscountsInLineItem(couponTotal: Record<string, PriceModel>) {
    const couponDiscounts: [string, PriceModel][] = Array.from(Object.entries(couponTotal))
      .filter(couponDiscount => !couponDiscount[1].isZero());

    const itemDiscounts = new Map<string, { coupon: CouponModel, amount: PriceModel }[]>();
    this.lineItems.forEach(li => itemDiscounts.set(li.getId(), []));

    couponDiscounts.forEach(([code, discountTotal]) => {
      const coupon = this.coupons.find(c => c.getCode() === code);
      if (!coupon || discountTotal.isZero()) return;

      const validItems = this.lineItems
        .filter(li => li.getState() !== LineItemState.CANCELLED && !li.getTotal().subtotal.isZero())
        .sort((a, b) => a.getTotal().subtotal.compareTo(b.getTotal().subtotal));

      let distributed = new PriceModel({ amount: 0, currency: this.currency });

      validItems.forEach((item, index) => {
        let amount: PriceModel;
        if (index === validItems.length - 1) {
          amount = discountTotal.subtract(distributed);
        } else {
          amount = discountTotal.multiply(item.getTotal().subtotal).divide(this.total.lineItemSubtotal).round();
        }
        distributed = distributed.add(amount);
        itemDiscounts.get(item.getId())?.push({ coupon, amount });
      });
    });

    this.lineItems.forEach(lineItem => {
      if (lineItem.getState() === LineItemState.CANCELLED || this.total.lineItemSubtotal.isZero()) {
        lineItem.updateDiscounts([]);
      } else {
        lineItem.updateDiscounts(itemDiscounts.get(lineItem.getId()) || []);
      }
    });
  }

  private applyDiscountsInShippingCharges(couponTotal: Record<string, PriceModel>) {
    const couponDiscounts: [string, PriceModel][] = Array.from(Object.entries(couponTotal))
      .filter(couponDiscount => !couponDiscount[1].isZero());
    const shippingCharges = this.charges.filter(charge => charge.getType() === ChargeType.SHIPPING);

    const chargeDiscounts = new Map<string, { coupon: CouponModel, amount: PriceModel }[]>();
    shippingCharges.forEach(li => chargeDiscounts.set(li.getId(), []));

    couponDiscounts.forEach(([code, discountTotal]) => {
      const coupon = this.coupons.find(c => c.getCode() === code);
      if (!coupon || discountTotal.isZero()) return;

      const validCharges = shippingCharges
        .sort((a, b) => a.getTotal().grandTotal.compareTo(b.getTotal().grandTotal));

      let distributed = new PriceModel({ amount: 0, currency: this.currency });

      validCharges.forEach((charge, index) => {
        let amount: PriceModel;
        if (index === validCharges.length - 1) {
          amount = discountTotal.subtract(distributed);
        } else {
          amount = discountTotal.multiply(charge.getTotal().chargeAmount).divide(this.total.shippingCharges).round();
        }
        distributed = distributed.add(amount);
        chargeDiscounts.get(charge.getId())?.push({ coupon, amount });
      });
    });

    shippingCharges.forEach(charge => {
      charge.updateDiscounts(chargeDiscounts.get(charge.getId()) || []);
    });
  }

  /**
   * Selects and applies the best applicable non-shipping coupon.
   * Currently supports applying only a single coupon of type COUPON.
   * @param applicableCoupons - List of available non-shipping coupons.
   */
  private applyNonShippingCoupons(applicableCoupons: CouponModel[]) {
    const coupons = applicableCoupons.filter(coupon => coupon.getType() === CouponType.COUPON);
    if (coupons.length === 1) {
      const couponValue = coupons[0].calculateApplicableCouponDiscount(this.total.lineItemSubtotal, this.total.shippingCharges, this.country, this.currency);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(coupons[0]);
        this.total.discountTotal = couponValue;
        this.total.discountBreakdown[coupons[0].getCode()] = couponValue;
      }
    }
    // Todo: Add support to other type in future like promotion
  }

  /**
   * Selects and applies the best applicable shipping coupon.
   * @param applicableCoupons - List of available shipping coupons.
   */
  private applyShippingCoupons(applicableCoupons: CouponModel[]) {
    if (this.total.shippingCharges.getAmount() > 0 && applicableCoupons.length > 0) {
      const netLineItemSubtotal = this.total.lineItemSubtotal.subtract(this.total.discountTotal);

      const maxValuedCoupon = applicableCoupons.reduce((maxCoupon, currentCoupon) => {
        if (!maxCoupon) return currentCoupon;

        const currentCouponValue = currentCoupon.calculateApplicableCouponDiscount(netLineItemSubtotal, this.total.shippingCharges, this.country, this.currency).min(this.total.shippingCharges);
        const maxCouponValue = maxCoupon.calculateApplicableCouponDiscount(netLineItemSubtotal, this.total.shippingCharges, this.country, this.currency).min(this.total.shippingCharges);

        if (currentCouponValue.compareTo(maxCouponValue) === 0) {
          return currentCoupon.getType() === CouponType.COUPON ? currentCoupon : maxCoupon;
        }
        return currentCouponValue.compareTo(maxCouponValue) > 0 ? currentCoupon : maxCoupon;
      });

      const couponValue = maxValuedCoupon.calculateApplicableCouponDiscount(netLineItemSubtotal, this.total.shippingCharges, this.country, this.currency).min(this.total.shippingCharges);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(maxValuedCoupon);
        this.total.discountTotal = this.total.discountTotal.add(couponValue);
        this.total.discountBreakdown[maxValuedCoupon.getCode()] = couponValue;
      }
    }
  }
}



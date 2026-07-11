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
  /** Total tax collected specifically from line items */
  lineItemTaxTotal: PriceData;
  /** Granular tax breakdown for all line items */
  lineItemTaxBreakdown: Record<string, TaxSystemBreakdown>;

  // --- Charge Totals ---
  /** Tax reverse-calculated from additive charges only */
  additiveChargesTaxTotal: PriceData;
  /** Granular tax breakdown from additive charges */
  additiveChargesTaxBreakdown: Record<string, TaxSystemBreakdown>;

  /** Sum of post-discount netChargeAmount for subtractive charges – absolute amount to subtract */
  adjustmentCharges:  PriceData;

  // --- Aggregate Totals ---
  /** Combined total tax (lineItemTaxTotal + chargeTaxTotal) */
  taxTotal: PriceData;
  /** Combined granular tax breakdown for the entire container */
  taxBreakdown: Record<string, TaxSystemBreakdown>;
  /** Sum of all coupon discounts applied to the container */
  discountTotal: PriceData;
  /** Map of applied coupon codes to their calculated discount amounts */
  discountBreakdown: Record<string, PriceData>;

  taxExclusive: {
    lineItemSubtotal: PriceData;
    netLineItemSubtotal: PriceData;
    additiveCharges: PriceData;
    netAdditiveCharges: PriceData;
    shippingCharges: PriceData;
    netShippingCharges: PriceData;
  };
  taxInclusive: {
    lineItemSubtotal: PriceData;
    netLineItemSubtotal: PriceData;
    additiveCharges: PriceData;
    netAdditiveCharges: PriceData;
    shippingCharges: PriceData;
    netShippingCharges: PriceData;
  };
  grandTotal: PriceData;
};


/**
 * Internal model version of ShoppingContainerTotal using PriceModel instances.
 */
export type ShoppingContainerTotalModel = {
  lineItemTaxTotal: PriceModel;
  lineItemTaxBreakdown: Record<string, TaxSystemBreakdownModel>;

  additiveChargesTaxTotal: PriceModel;
  additiveChargesTaxBreakdown: Record<string, TaxSystemBreakdownModel>;

  adjustmentCharges: PriceModel;

  taxTotal: PriceModel;
  taxBreakdown: Record<string, TaxSystemBreakdownModel>;
  discountTotal: PriceModel;
  discountBreakdown: Record<string, PriceModel>;

  taxExclusive: {
    lineItemSubtotal: PriceModel;
    netLineItemSubtotal: PriceModel;
    additiveCharges: PriceModel;
    netAdditiveCharges: PriceModel;
    shippingCharges: PriceModel;
    netShippingCharges: PriceModel;
  };
  taxInclusive: {
    lineItemSubtotal: PriceModel;
    netLineItemSubtotal: PriceModel;
    additiveCharges: PriceModel;
    netAdditiveCharges: PriceModel;
    shippingCharges: PriceModel;
    netShippingCharges: PriceModel;
  };
  grandTotal: PriceModel;
};

export type ShoppingContainerMetaData = {
  checkCouponExpiry: boolean
}

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
  #metaData: ShoppingContainerMetaData;

  /**
   * Creates an instance of BaseShoppingContainerModel.
   * Initializes common properties and calculates initial base totals.
   * @param data - The initial attributes for the shopping container.
   * @param date - Optional date object for setting creation/modification times (defaults to now).
   */
  constructor(data: BaseShoppingContainerAttributes, date: Date = new Date(), metaData: ShoppingContainerMetaData = { checkCouponExpiry: true }) {
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
      lineItemTaxTotal: new PriceModel(data.total.lineItemTaxTotal),
      lineItemTaxBreakdown: this.mapTaxBreakdown(data.total.lineItemTaxBreakdown),

      additiveChargesTaxTotal: new PriceModel(data.total.additiveChargesTaxTotal),
      additiveChargesTaxBreakdown: this.mapTaxBreakdown(data.total.additiveChargesTaxBreakdown),
      adjustmentCharges: new PriceModel(data.total.adjustmentCharges),

      discountTotal: new PriceModel(data.total.discountTotal),
      discountBreakdown: Object.fromEntries(
        Object.entries(data.total.discountBreakdown).map(([key, value]) => [key, new PriceModel(value)])
      ),

      taxTotal: new PriceModel(data.total.taxTotal),
      taxBreakdown: this.mapTaxBreakdown(data.total.taxBreakdown),

      taxExclusive: {
        lineItemSubtotal: new PriceModel(data.total.taxExclusive.lineItemSubtotal),
        netLineItemSubtotal: new PriceModel(data.total.taxExclusive.netLineItemSubtotal),
        additiveCharges: new PriceModel(data.total.taxExclusive.additiveCharges),
        netAdditiveCharges: new PriceModel(data.total.taxExclusive.netAdditiveCharges),
        shippingCharges: new PriceModel(data.total.taxExclusive.shippingCharges),
        netShippingCharges: new PriceModel(data.total.taxExclusive.netShippingCharges),
      },
      taxInclusive: {
        lineItemSubtotal: new PriceModel(data.total.taxInclusive.lineItemSubtotal),
        netLineItemSubtotal: new PriceModel(data.total.taxInclusive.netLineItemSubtotal),
        additiveCharges: new PriceModel(data.total.taxInclusive.additiveCharges),
        netAdditiveCharges: new PriceModel(data.total.taxInclusive.netAdditiveCharges),
        shippingCharges: new PriceModel(data.total.taxInclusive.shippingCharges),
        netShippingCharges: new PriceModel(data.total.taxInclusive.netShippingCharges),
      },
      grandTotal: new PriceModel(data.total.grandTotal),
    };

    this.#metaData = {
      checkCouponExpiry: metaData.checkCouponExpiry
    }
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
      taxExclusive: {
        lineItemSubtotal: this.total.taxExclusive.lineItemSubtotal,
        netLineItemSubtotal: this.total.taxExclusive.netLineItemSubtotal,
        additiveCharges: this.total.taxExclusive.additiveCharges,
        netAdditiveCharges: this.total.taxExclusive.netAdditiveCharges,
        shippingCharges: this.total.taxExclusive.shippingCharges,
        netShippingCharges: this.total.taxExclusive.netShippingCharges,
      },
      taxInclusive: {
        lineItemSubtotal: this.total.taxInclusive.lineItemSubtotal,
        netLineItemSubtotal: this.total.taxInclusive.netLineItemSubtotal,
        additiveCharges: this.total.taxInclusive.additiveCharges,
        netAdditiveCharges: this.total.taxInclusive.netAdditiveCharges,
        shippingCharges: this.total.taxInclusive.shippingCharges,
        netShippingCharges: this.total.taxInclusive.netShippingCharges,
      },
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
        lineItemTaxTotal: totals.lineItemTaxTotal.getDetails(),
        lineItemTaxBreakdown: this.serializeTaxBreakdown(totals.lineItemTaxBreakdown),

        // Charge Totals
        additiveChargesTaxTotal: totals.additiveChargesTaxTotal.getDetails(),
        additiveChargesTaxBreakdown: this.serializeTaxBreakdown(totals.additiveChargesTaxBreakdown),

        adjustmentCharges: totals.adjustmentCharges.getDetails(),

        // Aggregate Totals
        discountTotal: totals.discountTotal.getDetails(),
        discountBreakdown: Object.fromEntries(
          Object.entries(totals.discountBreakdown).map(([key, value]) => [key, value.getDetails()])
        ),
        taxTotal: totals.taxTotal.getDetails(),
        taxBreakdown: this.serializeTaxBreakdown(totals.taxBreakdown),

        taxExclusive: {
          lineItemSubtotal: totals.taxExclusive.lineItemSubtotal.getDetails(),
          netLineItemSubtotal: totals.taxExclusive.netLineItemSubtotal.getDetails(),
          additiveCharges: totals.taxExclusive.additiveCharges.getDetails(),
          netAdditiveCharges: totals.taxExclusive.netAdditiveCharges.getDetails(),
          shippingCharges: totals.taxExclusive.shippingCharges.getDetails(),
          netShippingCharges: totals.taxExclusive.netShippingCharges.getDetails(),
        },
        taxInclusive: {
          lineItemSubtotal: totals.taxInclusive.lineItemSubtotal.getDetails(),
          netLineItemSubtotal: totals.taxInclusive.netLineItemSubtotal.getDetails(),
          additiveCharges: totals.taxInclusive.additiveCharges.getDetails(),
          netAdditiveCharges: totals.taxInclusive.netAdditiveCharges.getDetails(),
          shippingCharges: totals.taxInclusive.shippingCharges.getDetails(),
          netShippingCharges: totals.taxInclusive.netShippingCharges.getDetails(),
        },
        grandTotal: totals.grandTotal.getDetails(),
      },
      country: this.getCountry(),
      currency: this.getCurrency(),
      locale: this.getLocale(),
    };
  }

  /**
   * Recalculates the total costs for the shopping container.
   * This orchestrates computing base totals, applying active coupons, and aggregating the final net results.
   */
  public calculateTotals(): void {
    const zero = new PriceModel({ amount: 0, currency: this.currency });

    // Step 1: Initialize baseline totals for all active items and charges.
    // We clear any existing discounts so we can evaluate base subtotals accurately.
    this.lineItems.forEach(li => {
      if (li.getState() !== LineItemState.CANCELLED) li.updateDiscounts([]);
    });
    this.charges.forEach(charge => charge.updateDiscounts([]));

    // Step 2: Evaluate Non-Shipping Coupons on gross subtotals
    const bases = this.getCouponEvaluationBases();
    let discountTotal = zero;
    let discountBreakdown: Record<string, PriceModel> = {};
    let nonShippingCouponTotal: Record<string, PriceModel> = {};

    const nonShippingCoupons = this.coupons.filter(c => c.getCategory() !== CouponCategory.SHIPPING);
    nonShippingCoupons.forEach(coupon => {
      const couponValue = coupon.calculateApplicableCouponDiscount(bases.targetSubtotal, bases.targetShipping, this.country, this.currency, this.#metaData.checkCouponExpiry);
      discountTotal = discountTotal.add(couponValue);
      discountBreakdown[coupon.getCode()] = couponValue;
      nonShippingCouponTotal[coupon.getCode()] = couponValue;
    });

    // Step 3: Distribute Non-Shipping Coupons
    // This internally recalculates the net subtotals and taxes for line items.
    this.applyDiscountsInLineItem(nonShippingCouponTotal);

    // Step 4: Evaluate Shipping Coupons using dynamically updated Net Subtotals
    const updatedBases = this.getCouponEvaluationBases();
    let shippingCouponTotal: Record<string, PriceModel> = {};
    
    const shippingCoupons = this.coupons.filter(c => c.getCategory() === CouponCategory.SHIPPING);
    shippingCoupons.forEach(coupon => {
      const couponValue = coupon.calculateApplicableCouponDiscount(updatedBases.targetNetSubtotal, updatedBases.targetShipping, this.country, this.currency, this.#metaData.checkCouponExpiry).min(updatedBases.targetShipping);
      discountTotal = discountTotal.add(couponValue);
      discountBreakdown[coupon.getCode()] = couponValue;
      shippingCouponTotal[coupon.getCode()] = couponValue;
    });

    // Step 5: Distribute Shipping Coupons
    this.applyDiscountsInShippingCharges(shippingCouponTotal);

    // Step 6: Aggregate everything into `this.total`
    let lineItemTaxTotal = zero;
    let additiveChargesTaxTotal = zero;

    let lineItemSubtotalExcl = zero;
    let netLineItemSubtotalExcl = zero;
    let lineItemSubtotalIncl = zero;
    let netLineItemSubtotalIncl = zero;

    const taxBreakdown: ShoppingContainerTaxBreakdownModel = {};
    const lineItemTaxBreakdown: ShoppingContainerTaxBreakdownModel = {};
    const additiveChargesTaxBreakdown: ShoppingContainerTaxBreakdownModel = {};

    const mergeTax = (source: Record<string, LineItemTaxBreakdownModel | ChargeTaxBreakdownModel>, target: ShoppingContainerTaxBreakdownModel) => {
      Object.entries(source).forEach(([_, breakdown]) => {
        const { system, subSystem, taxAmount } = breakdown;
        if (!target[system]) target[system] = { system, totalAmount: zero, subSystems: {} };
        if (!target[system].subSystems[subSystem]) target[system].subSystems[subSystem] = taxAmount;
        else target[system].subSystems[subSystem] = target[system].subSystems[subSystem].add(taxAmount);
        target[system].totalAmount = target[system].totalAmount.add(taxAmount);
      });
    };

    const filteredLineItems = this.lineItems.filter(li => li.getState() !== LineItemState.CANCELLED);
    filteredLineItems.forEach(li => {
      const t = li.getTotal();
      lineItemSubtotalExcl = lineItemSubtotalExcl.add(t.taxExclusive.subtotal);
      netLineItemSubtotalExcl = netLineItemSubtotalExcl.add(t.taxExclusive.netSubtotal);
      lineItemSubtotalIncl = lineItemSubtotalIncl.add(t.taxInclusive.subtotal);
      netLineItemSubtotalIncl = netLineItemSubtotalIncl.add(t.taxInclusive.netSubtotal);

      if (t.taxBreakdown) {
        mergeTax(t.taxBreakdown, lineItemTaxBreakdown);
        mergeTax(t.taxBreakdown, taxBreakdown);
        lineItemTaxTotal = lineItemTaxTotal.add(t.taxTotal);
      }
    });

    let additiveChargesExcl = zero;
    let netAdditiveChargesExcl = zero;
    let additiveChargesIncl = zero;
    let netAdditiveChargesIncl = zero;

    let shippingChargesExcl = zero;
    let netShippingChargesExcl = zero;
    let shippingChargesIncl = zero;
    let netShippingChargesIncl = zero;

    let adjustmentChargesIncl = zero;

    this.charges.forEach(charge => {
      const t = charge.getTotal();
      if (charge.getImpact() === ChargeImpact.ADD) {
        additiveChargesExcl = additiveChargesExcl.add(t.taxExclusive.chargeAmount);
        netAdditiveChargesExcl = netAdditiveChargesExcl.add(t.taxExclusive.netChargeAmount);
        additiveChargesIncl = additiveChargesIncl.add(t.taxInclusive.chargeAmount);
        netAdditiveChargesIncl = netAdditiveChargesIncl.add(t.grandTotal);

        if (charge.getType() === ChargeType.SHIPPING) {
          shippingChargesExcl = shippingChargesExcl.add(t.taxExclusive.chargeAmount);
          netShippingChargesExcl = netShippingChargesExcl.add(t.taxExclusive.netChargeAmount);
          shippingChargesIncl = shippingChargesIncl.add(t.taxInclusive.chargeAmount);
          netShippingChargesIncl = netShippingChargesIncl.add(t.grandTotal);
        }

        if (t.taxBreakdown) {
          mergeTax(t.taxBreakdown, additiveChargesTaxBreakdown);
          mergeTax(t.taxBreakdown, taxBreakdown);
          additiveChargesTaxTotal = additiveChargesTaxTotal.add(t.taxTotal);
        }
      } else if (charge.getImpact() === ChargeImpact.SUBTRACT) {
        adjustmentChargesIncl = adjustmentChargesIncl.add(t.grandTotal);
      }
    });

    const taxTotal = lineItemTaxTotal.add(additiveChargesTaxTotal);
    const grandTotal = netLineItemSubtotalIncl.add(netAdditiveChargesIncl).subtract(adjustmentChargesIncl);

    this.total = {
      lineItemTaxTotal,
      lineItemTaxBreakdown,
      additiveChargesTaxTotal,
      additiveChargesTaxBreakdown,
      adjustmentCharges: adjustmentChargesIncl,
      discountTotal,
      discountBreakdown,
      taxTotal,
      taxBreakdown,
      taxExclusive: {
        lineItemSubtotal: lineItemSubtotalExcl,
        netLineItemSubtotal: netLineItemSubtotalExcl,
        additiveCharges: additiveChargesExcl,
        netAdditiveCharges: netAdditiveChargesExcl,
        shippingCharges: shippingChargesExcl,
        netShippingCharges: netShippingChargesExcl,
      },
      taxInclusive: {
        lineItemSubtotal: lineItemSubtotalIncl,
        netLineItemSubtotal: netLineItemSubtotalIncl,
        additiveCharges: additiveChargesIncl,
        netAdditiveCharges: netAdditiveChargesIncl,
        shippingCharges: shippingChargesIncl,
        netShippingCharges: netShippingChargesIncl,
      },
      grandTotal,
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
    this.total.discountTotal = this.total.discountTotal.zero();
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

      const targetSubtotal = this.lineItems.reduce(
        (total, lineItem) => total.add(lineItem.getIsTaxInclusive() ? lineItem.getTotal().taxInclusive.subtotal : lineItem.getTotal().taxExclusive.subtotal),
        new PriceModel({ amount: 0, currency: this.currency })
      );

      const validItems = this.lineItems
        .filter(li => li.getState() !== LineItemState.CANCELLED && !li.getTotal().taxExclusive.subtotal.isZero())
        .sort((a, b) => {
          const aVal = a.getIsTaxInclusive() ? a.getTotal().taxInclusive.subtotal : a.getTotal().taxExclusive.subtotal;
          const bVal = b.getIsTaxInclusive() ? b.getTotal().taxInclusive.subtotal : b.getTotal().taxExclusive.subtotal;
          return aVal.compareTo(bVal);
        });

      let distributed = new PriceModel({ amount: 0, currency: this.currency });

      validItems.forEach((item, index) => {
        let amount: PriceModel;
        const itemVal = item.getIsTaxInclusive() ? item.getTotal().taxInclusive.subtotal : item.getTotal().taxExclusive.subtotal;
        if (index === validItems.length - 1) {
          amount = discountTotal.subtract(distributed);
        } else {
          amount = discountTotal.multiply(itemVal).divide(targetSubtotal).round();
        }
        distributed = distributed.add(amount);
        itemDiscounts.get(item.getId())?.push({ coupon, amount });
      });
    });

    this.lineItems.forEach(lineItem => {
      lineItem.updateDiscounts(itemDiscounts.get(lineItem.getId())!);
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

      const targetShipping = shippingCharges.reduce(
        (total, charge) => total.add(charge.getIsTaxInclusive() ? charge.getTotal().taxInclusive.chargeAmount : charge.getTotal().taxExclusive.chargeAmount),
        new PriceModel({ amount: 0, currency: this.currency })
      );

      const validCharges = shippingCharges
        .filter(charge => !charge.getTotal().taxExclusive.chargeAmount.isZero())
        .sort((a, b) => {
          const aVal = a.getIsTaxInclusive() ? a.getTotal().taxInclusive.chargeAmount : a.getTotal().taxExclusive.chargeAmount;
          const bVal = b.getIsTaxInclusive() ? b.getTotal().taxInclusive.chargeAmount : b.getTotal().taxExclusive.chargeAmount;
          return aVal.compareTo(bVal);
        });

      let distributed = new PriceModel({ amount: 0, currency: this.currency });

      validCharges.forEach((charge, index) => {
        let amount: PriceModel;
        const chargeVal = charge.getIsTaxInclusive() ? charge.getTotal().taxInclusive.chargeAmount : charge.getTotal().taxExclusive.chargeAmount;
        if (index === validCharges.length - 1) {
          amount = discountTotal.subtract(distributed);
        } else {
          amount = discountTotal.multiply(chargeVal).divide(targetShipping).round();
        }
        distributed = distributed.add(amount);
        chargeDiscounts.get(charge.getId())?.push({ coupon, amount });
      });
    });

    shippingCharges.forEach(charge => {
      charge.updateDiscounts(chargeDiscounts.get(charge.getId())!);
    });
  }

  /**
   * Helper to resolve the correct evaluation basis for line items and shipping charges.
   * If any item in a group is tax-inclusive, the inclusive total is used for the entire group.
   * Otherwise, the exclusive total is used.
   */
  private getCouponEvaluationBases() {
    const zero = new PriceModel({ amount: 0, currency: this.currency });
    const activeItems = this.lineItems.filter(li => li.getState() !== LineItemState.CANCELLED);
    const shippingCharges = this.charges.filter(charge => charge.getType() === ChargeType.SHIPPING);

    const isAnyItemInclusive = activeItems.some(li => li.getIsTaxInclusive());
    const targetSubtotal = activeItems.reduce(
      (total, li) => total.add(isAnyItemInclusive ? li.getTotal().taxInclusive.subtotal : li.getTotal().taxExclusive.subtotal),
      zero
    );

    const targetNetSubtotal = activeItems.reduce(
      (total, li) => total.add(isAnyItemInclusive ? li.getTotal().taxInclusive.netSubtotal : li.getTotal().taxExclusive.netSubtotal),
      zero
    );

    const isAnyShippingInclusive = shippingCharges.some(c => c.getIsTaxInclusive());
    const targetShipping = shippingCharges.reduce(
      (total, c) => total.add(isAnyShippingInclusive ? c.getTotal().taxInclusive.chargeAmount : c.getTotal().taxExclusive.chargeAmount),
      zero
    );

    return { targetSubtotal, targetShipping, targetNetSubtotal };
  }

  /**
   * Selects and applies the best applicable non-shipping coupon.
   * Currently supports applying only a single coupon of type COUPON.
   * @param applicableCoupons - List of available non-shipping coupons.
   */
  private applyNonShippingCoupons(applicableCoupons: CouponModel[]) {
    const coupons = applicableCoupons.filter(coupon => coupon.getType() === CouponType.COUPON);
    if (coupons.length === 1) {
      const bases = this.getCouponEvaluationBases();
      const couponValue = coupons[0].calculateApplicableCouponDiscount(bases.targetSubtotal, bases.targetShipping, this.country, this.currency, this.#metaData.checkCouponExpiry);
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
    const bases = this.getCouponEvaluationBases();
    if (bases.targetShipping.getAmount() > 0 && applicableCoupons.length > 0) {
      const netLineItemSubtotal = bases.targetNetSubtotal;

      const maxValuedCoupon = applicableCoupons.reduce((maxCoupon, currentCoupon) => {
        if (!maxCoupon) return currentCoupon;

        const currentCouponValue = currentCoupon.calculateApplicableCouponDiscount(netLineItemSubtotal, bases.targetShipping, this.country, this.currency, this.#metaData.checkCouponExpiry).min(bases.targetShipping);
        const maxCouponValue = maxCoupon.calculateApplicableCouponDiscount(netLineItemSubtotal, bases.targetShipping, this.country, this.currency, this.#metaData.checkCouponExpiry).min(bases.targetShipping);

        if (currentCouponValue.compareTo(maxCouponValue) === 0) {
          return currentCoupon.getType() === CouponType.COUPON ? currentCoupon : maxCoupon;
        }
        return currentCouponValue.compareTo(maxCouponValue) > 0 ? currentCoupon : maxCoupon;
      });

      const couponValue = maxValuedCoupon.calculateApplicableCouponDiscount(netLineItemSubtotal, bases.targetShipping, this.country, this.currency, this.#metaData.checkCouponExpiry).min(bases.targetShipping);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(maxValuedCoupon);
        this.total.discountTotal = this.total.discountTotal.add(couponValue);
        this.total.discountBreakdown[maxValuedCoupon.getCode()] = couponValue;
      }
    }
  }

}



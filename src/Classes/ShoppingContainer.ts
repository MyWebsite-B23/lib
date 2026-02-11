import BaseModel, { BaseAttributes, BaseData } from "./Base";
import AddressModel, { AddressData } from "./Address";
import LineItemModel, { LineItemData, LineItemTaxBreakdown, LineItemTaxBreakdownModel } from "./LineItem";
import { CountryCode, CurrencyCode, LocaleCode, ShippingDetails } from "./Common";
import PriceModel, { PriceData } from "./Price";
import CouponModel, { CouponCategory, CouponData, CouponType } from "./Coupon";
import Utils from "../Utils";
import { ChargeImpact, ChargeType, LineItemState, TaxSystem } from "./Enum";
import { FixedTaxRuleModel, TaxRuleModel } from "./TaxRule";
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
  subtotal: PriceData;
  /** Total item subtotal after item-level discounts have been applied (taxable base for items) */
  netSubtotal: PriceData;
  /** Total tax collected specifically from line items */
  lineItemTaxTotal: PriceData;
  /** Granular tax breakdown for all line items */
  lineItemTaxBreakdown: Record<string, TaxSystemBreakdown>;

  // --- Charge Totals ---
  /** Sum of all extra charges (shipping, processing, etc.) before tax */
  chargesTotal: PriceData;
  /** Sum of subtractive adjustment charges (non-taxed) */
  adjustmentChargesTotal: PriceData;
  /** Specifically the shipping portion of charges */
  shippingCharge: PriceData;
  /** Shipping cost after any shipping-specific discounts */
  netShippingCharge: PriceData;
  /** Total tax collected specifically from charges */
  chargeTaxTotal: PriceData;
  /** Granular tax breakdown for all charges */
  chargeTaxBreakdown: Record<string, TaxSystemBreakdown>;

  // --- Aggregate Totals ---
  /** Combined total tax (lineItemTaxTotal + chargeTaxTotal) */
  taxTotal: PriceData;
  /** Combined granular tax breakdown for the entire container */
  taxBreakdown: Record<string, TaxSystemBreakdown>;
  /** Map of applied coupon codes to their calculated discount amounts */
  discounts: Record<string, PriceData>;
  /** Sum of all coupon discounts applied to the container */
  totalDiscount: PriceData;
  /** Final total amount to be paid (NetSubtotal + ChargesTotal + TaxTotal - (any remaining discounts)) */
  grandTotal: PriceData;
};

/**
 * Internal model version of ShoppingContainerTotal using PriceModel instances.
 */
export type ShoppingContainerTotalModel = {
  subtotal: PriceModel;
  netSubtotal: PriceModel;
  lineItemTaxTotal: PriceModel;
  lineItemTaxBreakdown: Record<string, TaxSystemBreakdownModel>;

  chargesTotal: PriceModel;
  adjustmentChargesTotal : PriceModel;
  shippingCharge: PriceModel;
  netShippingCharge: PriceModel;
  chargeTaxTotal: PriceModel;
  chargeTaxBreakdown: Record<string, TaxSystemBreakdownModel>;

  taxTotal: PriceModel;
  taxBreakdown: Record<string, TaxSystemBreakdownModel>;
  discounts: Record<string, PriceModel>;
  totalDiscount: PriceModel;
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
      subtotal: new PriceModel(data.total.subtotal),
      netSubtotal: new PriceModel(data.total.netSubtotal),
      lineItemTaxTotal: new PriceModel(data.total.lineItemTaxTotal || { amount: 0, currency: data.currency }),
      lineItemTaxBreakdown: this.mapTaxBreakdown(data.total.lineItemTaxBreakdown || {}),

      chargesTotal: new PriceModel(data.total.chargesTotal || { amount: 0, currency: data.currency }),
      adjustmentChargesTotal : new PriceModel(data.total.adjustmentChargesTotal ),
      shippingCharge: new PriceModel(data.total.shippingCharge),
      netShippingCharge: new PriceModel(data.total.netShippingCharge),
      chargeTaxTotal: new PriceModel(data.total.chargeTaxTotal || { amount: 0, currency: data.currency }),
      chargeTaxBreakdown: this.mapTaxBreakdown(data.total.chargeTaxBreakdown || {}),

      taxTotal: new PriceModel(data.total.taxTotal),
      taxBreakdown: this.mapTaxBreakdown(data.total.taxBreakdown),
      discounts: Object.fromEntries(
        Object.entries(data.total.discounts).map(([key, value]) => [key, new PriceModel(value)])
      ),
      totalDiscount: new PriceModel(data.total.totalDiscount),
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
      subtotal: this.total.subtotal,
      netSubtotal: this.total.netSubtotal,
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
        chargesTotal: this.total.chargesTotal,
        adjustmentChargesTotal : this.total.adjustmentChargesTotal,
        shippingCharge: this.total.shippingCharge,
      netShippingCharge: this.total.netShippingCharge,
      chargeTaxTotal: this.total.chargeTaxTotal,
      chargeTaxBreakdown: Object.fromEntries(
        Object.entries(this.total.chargeTaxBreakdown).map(([systemKey, systemValue]) => [
          systemKey,
          {
            system: systemValue.system,
            totalAmount: systemValue.totalAmount,
            subSystems: { ...systemValue.subSystems }
          }
        ])
      ),
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
      discounts: { ...this.total.discounts },
      totalDiscount: this.total.totalDiscount,
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
        subtotal: totals.subtotal.getDetails(),
        netSubtotal: totals.netSubtotal.getDetails(),
        lineItemTaxTotal: totals.lineItemTaxTotal.getDetails(),
        lineItemTaxBreakdown: this.serializeTaxBreakdown(totals.lineItemTaxBreakdown),

        // Charge Totals
        chargesTotal: totals.chargesTotal.getDetails(),
        adjustmentChargesTotal: totals.adjustmentChargesTotal.getDetails(),
        shippingCharge: totals.shippingCharge.getDetails(),
        netShippingCharge: totals.netShippingCharge.getDetails(),
        chargeTaxTotal: totals.chargeTaxTotal.getDetails(),
        chargeTaxBreakdown: this.serializeTaxBreakdown(totals.chargeTaxBreakdown),

        // Aggregate Totals
        taxTotal: totals.taxTotal.getDetails(),
        taxBreakdown: this.serializeTaxBreakdown(totals.taxBreakdown),
        discounts: Object.fromEntries(
          Object.entries(totals.discounts).map(([key, value]) => [key, value.getDetails()])
        ),
        totalDiscount: totals.totalDiscount.getDetails(),
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
    
    // 1. Calculate LineItem subtotals
    const filteredLineItems = this.lineItems.filter(lineitem => lineitem.getState() !== LineItemState.CANCELLED);
    const subTotal = filteredLineItems.reduce((total, lineItem) => total.add(lineItem.getTotal().subtotal), zero);
    const netSubtotal = filteredLineItems.reduce((total, lineItem) => total.add(lineItem.getTotal().netSubtotal), zero);

    // 2. Calculate Shipping Cost
    const shippingCharge = this.charges
      .filter(charge => charge.getChargeType() === ChargeType.SHIPPING)
      .reduce((total, charge) => total.add(charge.getTotal().price), zero);

    // 3. Calculate coupon values based on gross subtotal & shipping
    let totalDiscount = zero;
    let discounts: Record<string, PriceModel> = {};
    let nonShippingCouponTotal: Record<string, PriceModel> = {};
    this.coupons.forEach(coupon => {
      const couponValue = coupon.calculateApplicableCouponDiscount(subTotal, shippingCharge, this.country, this.currency);
      totalDiscount = totalDiscount.add(couponValue);
      discounts[coupon.getCode()] = couponValue;
      if (coupon.getCategory() !== CouponCategory.SHIPPING) {
        nonShippingCouponTotal[coupon.getCode()] = couponValue;
      }
    })

    // 4. Apply discounts at lineitem and shipping charges
    this.applyDiscountsInLineItem(nonShippingCouponTotal);

    const shippingCoupon = this.coupons.find(coupon => coupon.getCategory() === CouponCategory.SHIPPING);
    if(shippingCoupon) {
      this.applyDiscuountsInShippingCharges({[shippingCoupon.getCode()] : discounts[shippingCoupon.getCode()] || zero});
    } else {
      // If no shipping coupon, ensure any previous discounts on shipping charges are cleared
      this.applyDiscuountsInShippingCharges({});
    }

    // 5. Calculate charges and net shipping after discount
    const additiveChargesTotal = this.charges
      .filter(charge => charge.getChargeImpact() === ChargeImpact.ADD)
      .reduce((total, charge) => total.add(charge.getTotal().grandTotal), zero);
    const deductiveChargesTotal = this.charges
      .filter(charge => charge.getChargeImpact() === ChargeImpact.SUBTRACT)
      .reduce((total, charge) => total.add(charge.getTotal().grandTotal), zero);

    const chargesTotal = additiveChargesTotal;
    const adjustmentChargesTotal = deductiveChargesTotal;

    const netShippingCharge = this.charges
      .filter(charge => charge.getChargeType() === ChargeType.SHIPPING)
      .reduce((total, charge) => total.add(charge.getTotal().grandTotal), zero);

    // 6. Aggregate Taxes & Grand Total from all items and charges
    let taxTotal = zero;
    let lineItemTaxTotal = zero;
    let chargeTaxTotal = zero;

    const taxBreakdown: ShoppingContainerTaxBreakdownModel = {};
    const lineItemTaxBreakdown: ShoppingContainerTaxBreakdownModel = {};
    const chargeTaxBreakdown: ShoppingContainerTaxBreakdownModel = {};

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
          targetBreakdown[system].subSystems[subsystem] = breakdown.amount;
        } else {
          targetBreakdown[system].subSystems[subsystem] = targetBreakdown[system].subSystems[subsystem].add(breakdown.amount);
        }
        targetBreakdown[system].totalAmount = targetBreakdown[system].totalAmount.add(breakdown.amount);

        // Populate Combined taxBreakdown
        if (!taxBreakdown[system]) {
          taxBreakdown[system] = { system, totalAmount: zero, subSystems: {} };
        }
        if (!taxBreakdown[system].subSystems[subsystem]) {
          taxBreakdown[system].subSystems[subsystem] = breakdown.amount;
        } else {
          taxBreakdown[system].subSystems[subsystem] = taxBreakdown[system].subSystems[subsystem].add(breakdown.amount);
        }
        taxBreakdown[system].totalAmount = taxBreakdown[system].totalAmount.add(breakdown.amount);
      });
    };

    // 6.1 Merge line item taxes
    filteredLineItems.forEach(lineItem => {
      const lineItemTaxes = lineItem.getTotal().taxBreakdown;
      if (lineItemTaxes) {
        mergeTax(lineItemTaxes, lineItemTaxBreakdown);
        mergeTax(lineItemTaxes, taxBreakdown);
        lineItemTaxTotal = lineItemTaxTotal.add(lineItem.getTotal().taxTotal);
      }
    });

    // 6.2 Merge charge taxes
    this.charges.forEach(charge => {
      const chargeTaxes = charge.getTotal().taxBreakdown;
      if (chargeTaxes) {
        mergeTax(chargeTaxes, chargeTaxBreakdown);
        mergeTax(chargeTaxes, taxBreakdown);
        chargeTaxTotal = chargeTaxTotal.add(charge.getTotal().taxTotal);
      }
    });

    // 6.3 Calculate total tax
    taxTotal = lineItemTaxTotal.add(chargeTaxTotal);

    // 7. Final Grand Total: netSubtotal + netShippingCharge + taxTotal
    const grandTotal = netSubtotal.add(lineItemTaxTotal).add(chargesTotal).subtract(adjustmentChargesTotal);

    this.total = {
      subtotal: subTotal,
      netSubtotal: netSubtotal,
      lineItemTaxTotal: lineItemTaxTotal,
      lineItemTaxBreakdown: lineItemTaxBreakdown,

      chargesTotal: chargesTotal,
      adjustmentChargesTotal: adjustmentChargesTotal,
      shippingCharge: shippingCharge,
      netShippingCharge: netShippingCharge,
      chargeTaxTotal: chargeTaxTotal,
      chargeTaxBreakdown: chargeTaxBreakdown,

      taxTotal: taxTotal,
      taxBreakdown: taxBreakdown,
      discounts: discounts,
      totalDiscount: totalDiscount,
      grandTotal: grandTotal,
    };
  }

  /**
   * Updates the shipping details and recalculates the totals.
   * @param shippingDetails - The new shipping details to apply.
   */
  public updateShippingDetails(shippingDetails: ShippingDetails): void {
    this.shippingDetails = shippingDetails;
    this.calculateTotals();
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
    this.total.totalDiscount = this.total.subtotal.zero();
    this.total.discounts = {};
    // Apply non shipping coupons
    otherCoupons.length && this.applyNonShippingCoupons(otherCoupons);
    this.applyDiscountsInLineItem(this.total.discounts);

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

    couponDiscounts.forEach(([code, totalDiscount]) => {
      const coupon = this.coupons.find(c => c.getCode() === code);
      if (!coupon || totalDiscount.isZero()) return;

      const validItems = this.lineItems
        .filter(li => li.getState() !== LineItemState.CANCELLED && !li.getTotal().subtotal.isZero())
        .sort((a, b) => a.getTotal().subtotal.compareTo(b.getTotal().subtotal));

      let distributed = new PriceModel({ amount: 0, currency: this.currency });

      validItems.forEach((item, index) => {
        let amount: PriceModel;
        if (index === validItems.length - 1) {
          amount = totalDiscount.subtract(distributed);
        } else {
          amount = totalDiscount.multiply(item.getTotal().subtotal).divide(this.total.subtotal).round();
        }
        distributed = distributed.add(amount);
        itemDiscounts.get(item.getId())?.push({ coupon, amount });
      });
    });

    this.lineItems.forEach(lineItem => {
      if (lineItem.getState() === LineItemState.CANCELLED || this.total.subtotal.isZero()) {
        lineItem.updateDiscounts([]);
      } else {
        lineItem.updateDiscounts(itemDiscounts.get(lineItem.getId()) || []);
      }
    });
  }

  private applyDiscuountsInShippingCharges(couponTotal: Record<string, PriceModel>) {
    const couponDiscounts: [string, PriceModel][] = Array.from(Object.entries(couponTotal))
      .filter(couponDiscount => !couponDiscount[1].isZero());
    const shippingCharges = this.charges.filter(charge => charge.getChargeType() === ChargeType.SHIPPING);

    const chargeDiscounts = new Map<string, { coupon: CouponModel, amount: PriceModel }[]>();
    shippingCharges.forEach(li => chargeDiscounts.set(li.getId(), []));

    couponDiscounts.forEach(([code, totalDiscount]) => {
      const coupon = this.coupons.find(c => c.getCode() === code);
      if (!coupon || totalDiscount.isZero()) return;

      const validCharges = shippingCharges
        .sort((a, b) => a.getTotal().grandTotal.compareTo(b.getTotal().grandTotal));

      let distributed = new PriceModel({ amount: 0, currency: this.currency });

      validCharges.forEach((charge, index) => {
        let amount: PriceModel;
        if (index === validCharges.length - 1) {
          amount = totalDiscount.subtract(distributed);
        } else {
          amount = totalDiscount.multiply(charge.getTotal().grandTotal).divide(this.total.subtotal).round();
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
      const couponValue = coupons[0].calculateApplicableCouponDiscount(this.total.subtotal, this.total.shippingCharge, this.country, this.currency);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(coupons[0]);
        this.total.discounts[coupons[0].getCode()] = couponValue;
        this.total.totalDiscount = couponValue;
      }
    }
    // Todo: Add support to other type in future like promotion
  }

  /**
   * Selects and applies the best applicable shipping coupon.
   * @param applicableCoupons - List of available shipping coupons.
   */
  private applyShippingCoupons(applicableCoupons: CouponModel[]) {
    if (this.total.shippingCharge.getAmount() > 0 && applicableCoupons.length > 0) {
      const subTotalWithCouponDiscount = this.total.subtotal.subtract(this.total.totalDiscount);

      const maxValuedCoupon = applicableCoupons.reduce((maxCoupon, currentCoupon) => {
        if (!maxCoupon) return currentCoupon;

        const currentCouponValue = currentCoupon.calculateApplicableCouponDiscount(subTotalWithCouponDiscount, this.total.shippingCharge, this.country, this.currency).min(this.total.shippingCharge);
        const maxCouponValue = maxCoupon.calculateApplicableCouponDiscount(subTotalWithCouponDiscount, this.total.shippingCharge, this.country, this.currency).min(this.total.shippingCharge);

        if (currentCouponValue === maxCouponValue) {
          return currentCoupon.getType() === 'coupon' ? currentCoupon : maxCoupon;
        }
        return currentCouponValue.compareTo(maxCouponValue) > 0 ? currentCoupon : maxCoupon;
      });

      const couponValue = maxValuedCoupon.calculateApplicableCouponDiscount(subTotalWithCouponDiscount, this.total.shippingCharge, this.country, this.currency).min(this.total.shippingCharge);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(maxValuedCoupon);
        this.total.discounts[maxValuedCoupon.getCode()] = couponValue;
        this.total.totalDiscount = this.total.totalDiscount.add(couponValue);
        this.total.netShippingCharge = this.total.shippingCharge.subtract(couponValue);
      }
    }
  }
}



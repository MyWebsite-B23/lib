import BaseModel, { BaseAttributes, BaseData } from "./Base";
import AddressModel, { AddressData } from "./Address";
import LineItemModel, { LineItemData } from "./LineItem";
import { CountryCode, CurrencyCode, LocaleCode, ShippingDetails } from "./Common";
import PriceModel, { PriceData } from "./Price";
import CouponModel, { CouponCategory, CouponData, CouponType } from "./Coupon";
import Utils from "../Utils";
import { LineItemState, TaxCategory } from "./Enum";
import { TaxRuleModel } from "./TaxRule";

export type ShoppingContainerTotal = {
  /** Sum of item prices before discounts & tax */
  subtotal: PriceData;

  /** Original shipping cost before coupons / promotions */
  shipping: PriceData;

  /** Shipping after coupons / promotions (>= 0) */
  effectiveShipping: PriceData;

  /** Total tax amount (all tax rules combined) */
  taxTotal: PriceData;

  /**
   * Coupon discounts applied
   * key = couponCode (or couponId)
   * value = discount amount (positive number)
   */
  couponTotal: Record<string, PriceData>;

  /** Total discount from coupons (derived, optional to store) */
  couponDiscountTotal: PriceData;

  /** Final payable amount */
  grandTotal: PriceData;
};


export type BaseShoppingContainerAttributes = BaseAttributes & {
  id: string;
  customerId?: string;
  customerEmail?: string;
  anonymousId?: string;
  lineItems: LineItemData[];
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
  protected shippingDetails: ShippingDetails | null;
  protected shippingAddress: AddressModel | null;
  protected billingAddress: AddressModel | null;

  // CouponsCodes
  protected coupons: CouponModel[];

  // Cart Totals
  protected total: {
    subtotal: PriceModel;
    shipping: PriceModel;
    effectiveShipping: PriceModel;
    taxTotal: PriceModel;
    couponTotal: Record<string, PriceModel>;
    couponDiscountTotal: PriceModel;
    grandTotal: PriceModel;
  };

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
    this.billingAddress = data.billingAddress ? new AddressModel(data.billingAddress, date) : null;
    this.shippingAddress = data.shippingAddress ? new AddressModel(data.shippingAddress, date) : null;
    this.coupons = (data.coupons ?? []).map(coupon => new CouponModel(coupon));

    this.shippingDetails = data.shippingDetails ? Utils.deepClone(data.shippingDetails) : null;

    this.total = {
      subtotal: new PriceModel(data.total.subtotal),
      shipping: new PriceModel(data.total.shipping),
      effectiveShipping: new PriceModel(data.total.effectiveShipping),
      taxTotal: new PriceModel(data.total.taxTotal),
      couponTotal: Object.fromEntries(
        Object.entries(data.total.couponTotal).map(([key, value]) => [key, new PriceModel(value)])
      ),
      couponDiscountTotal: new PriceModel(data.total.couponDiscountTotal),
      grandTotal: new PriceModel(data.total.grandTotal),
    };
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
   * Gets a copy of the shipping details associated with the container.
   * @returns A ShippingDetails object, or null if none are set.
   */
  public getShippingDetails(): ShippingDetails | null {
    // Return a shallow copy if details exist
    return this.shippingDetails ? { ...this.shippingDetails } : null;
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
    return this.coupons;
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
    return this.total;
  }

  /**
   * Gets a plain data object representing the shopping container's current state.
   * Includes details from the base model and specific container properties.
   * @returns BaseShoppingContainerData object suitable for serialization or API responses.
   */
  getDetails(): BaseShoppingContainerData {
    return {
      ...super.getDetails(),
      id: this.getId(),
      customerId: this.getCustomerId(),
      customerEmail: this.getCustomerEmail(),
      anonymousId: this.getAnonymousId(),
      lineItems: this.getLineItems().map(item => item.getDetails()),
      shippingDetails: this.getShippingDetails(),
      shippingAddress: this.getShippingAddress()?.getDetails() || null,
      billingAddress: this.getBillingAddress()?.getDetails() || null,
      coupons: this.getCoupons().map(coupon => coupon.getDetails()),
      total: {
        subtotal: this.getTotal().subtotal.getDetails(),
        shipping: this.getTotal().shipping.getDetails(),
        effectiveShipping: this.getTotal().effectiveShipping.getDetails(),
        taxTotal: this.getTotal().taxTotal.getDetails(),
        couponTotal: Object.fromEntries(Object.entries(this.getTotal().couponTotal).map(([key, value]) => [key, value.getDetails()])),
        couponDiscountTotal: this.getTotal().couponDiscountTotal.getDetails(),
        grandTotal: this.getTotal().grandTotal.getDetails(),
      },
      country: this.getCountry(),
      currency: this.getCurrency(),
      locale: this.getLocale(),
    }
  };

  /**
   * Recalculates the total costs for the shopping container.
   * This includes summing line items, calculating shipping, applying coupons, and computing taxes.
   */
  public calculateTotals(): void {
    const zero = new PriceModel({ amount: 0, currency: this.currency });
    const filteredLineItems = this.lineItems.filter(lineitem => lineitem.getState() !== LineItemState.CANCELLED);
    const subTotal = filteredLineItems.reduce((total, lineItem) => total.add(lineItem.getTotal().subtotal), zero);

    const shipping = new PriceModel({ amount: this.shippingDetails?.cost || 0, currency: this.currency }).round();

    let couponDiscountTotal = zero;
    let couponTotal: Record<string, PriceModel> = {};
    let nonShippingCouponTotal: Record<string, PriceModel> = {};
    this.coupons.forEach(coupon => {
      const couponValue = coupon.calculateApplicableCouponDiscount(subTotal, shipping, this.country, this.currency);
      couponDiscountTotal = couponDiscountTotal.add(couponValue);
      couponTotal[coupon.getCode()] = couponValue;
      if (coupon.getCategory() !== CouponCategory.SHIPPING) {
        nonShippingCouponTotal[coupon.getCode()] = couponValue;
      }
    })
    this.applyDiscountsInLineItem(nonShippingCouponTotal);

    const taxTotal = filteredLineItems.reduce((total, lineItem) => total.add(lineItem.getTotal().taxTotal), zero);
    const shippingCoupon = this.coupons.find(coupon => coupon.getCategory() === CouponCategory.SHIPPING);
    const effectiveShipping = shippingCoupon ? shipping.subtract(couponTotal[shippingCoupon.getCode()] || zero) : shipping;

    const grandTotal = subTotal.add(shipping).add(taxTotal).subtract(couponDiscountTotal);

    this.total = {
      subtotal: subTotal,
      shipping: shipping,
      effectiveShipping: effectiveShipping,
      couponTotal: couponTotal,
      couponDiscountTotal: couponDiscountTotal,
      taxTotal: taxTotal,
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
    this.total.couponDiscountTotal = this.total.subtotal.zero();
    this.total.couponTotal = {};
    // Apply non shipping coupons
    otherCoupons.length && this.applyNonShippingCoupons(otherCoupons);
    this.applyDiscountsInLineItem(this.total.couponTotal);

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

  /**
   * Updates the tax rules for all line items and recalculates totals.
   * @param taxRules - A record of tax rules keyed by tax category.
   */
  public updateTax(taxRules: Record<TaxCategory, TaxRuleModel>): void {
    this.lineItems.forEach(lineItem => {
      lineItem.updateTax(taxRules[lineItem.getPricing().taxCategory]);
    });
    this.calculateTotals();
  }

  /**
   * Selects and applies the best applicable non-shipping coupon.
   * Currently supports applying only a single coupon of type COUPON.
   * @param applicableCoupons - List of available non-shipping coupons.
   */
  private applyNonShippingCoupons(applicableCoupons: CouponModel[]) {
    const coupons = applicableCoupons.filter(coupon => coupon.getType() === CouponType.COUPON);
    if (coupons.length === 1) {
      const couponValue = coupons[0].calculateApplicableCouponDiscount(this.total.subtotal, this.total.shipping, this.country, this.currency);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(coupons[0]);
        this.total.couponTotal[coupons[0].getCode()] = couponValue;
        this.total.couponDiscountTotal = couponValue;
      }
    }
    // Todo: Add support to other type in future like promotion
  }

  /**
   * Selects and applies the best applicable shipping coupon.
   * @param applicableCoupons - List of available shipping coupons.
   */
  private applyShippingCoupons(applicableCoupons: CouponModel[]) {
    if (this.total.shipping.getAmount() > 0 && applicableCoupons.length > 0) {
      const subTotalWithCouponDiscount = this.total.subtotal.subtract(this.total.couponDiscountTotal);

      const maxValuedCoupon = applicableCoupons.reduce((maxCoupon, currentCoupon) => {
        if (!maxCoupon) return currentCoupon;

        const currentCouponValue = currentCoupon.calculateApplicableCouponDiscount(subTotalWithCouponDiscount, this.total.shipping, this.country, this.currency).min(this.total.shipping);
        const maxCouponValue = maxCoupon.calculateApplicableCouponDiscount(subTotalWithCouponDiscount, this.total.shipping, this.country, this.currency).min(this.total.shipping);

        if (currentCouponValue === maxCouponValue) {
          return currentCoupon.getType() === 'coupon' ? currentCoupon : maxCoupon;
        }
        return currentCouponValue > maxCouponValue ? currentCoupon : maxCoupon;
      });

      const couponValue = maxValuedCoupon.calculateApplicableCouponDiscount(subTotalWithCouponDiscount, this.total.shipping, this.country, this.currency).min(this.total.shipping);
      if (couponValue.getAmount() > 0) {
        this.coupons.push(maxValuedCoupon);
        this.total.couponTotal[maxValuedCoupon.getCode()] = couponValue;
        this.total.couponDiscountTotal = this.total.couponDiscountTotal.add(couponValue);
        this.total.effectiveShipping = this.total.shipping.subtract(couponValue);
      }
    }
  }
}



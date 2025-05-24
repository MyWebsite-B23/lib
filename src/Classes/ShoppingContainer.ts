import BaseModel, { BaseAttributes, BaseData } from "./Base";
import AddressModel, { AddressData } from "./Address";
import LineItemModel, { LineItemData } from "./LineItem";
import { CountryCode, CurrencyCode, LocaleCode, ShippingDetails } from "./Common";
import PriceModel from "./Price";
import CouponModel, { CouponCategory, CouponData, CouponDiscountMethod } from "./Coupon";

export type ShoppingContainerTotal = {
  shipping?: number;
  effectiveShipping?: number;
  subtotal?: number;
  mrpTotal?: number;
  couponTotal?: { [key: string]: number };
  grandTotal?: number;
}

export type BaseShoppingContainerAttributes = BaseAttributes & {
  id: string;
  customerId?: string;
  customerEmail?: string;
  anonymousId?: string;
  lineItems: LineItemData[];
  shippingDetails: ShippingDetails | null;
  shippingAddress?: AddressData | null;
  billingAddress?: AddressData | null;
  coupons?: CouponData[];
  total?: ShoppingContainerTotal;
  country: CountryCode;
  currency: CurrencyCode;
  locale: LocaleCode;
};

export type BaseShoppingContainerData = Omit<BaseShoppingContainerAttributes, 'coupons' | 'total'>
& BaseData
& {
    coupons: CouponData[],
    total: {
      shipping: number,
      effectiveShipping: number,
      subtotal: number,
      mrpTotal: number,
      couponTotal: { [key: string]: number },
      grandTotal: number
    };
  };


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
    shipping: number;
    effectiveShipping: number;
    subtotal: number;
    mrpTotal: number;
    couponTotal: { [key: string]: number; };
    grandTotal: number;
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
    this.coupons = (data.coupons || []).map(coupon => new CouponModel(coupon));

    this.shippingDetails = data.shippingDetails ? { ...data.shippingDetails } : null;

    this.total = {
      shipping: data.total?.shipping || 0,
      effectiveShipping: data.total?.effectiveShipping || data.total?.shipping || 0,
      subtotal: 0, // Will be calculated
      mrpTotal: 0, // Will be calculated
      couponTotal: data.total?.couponTotal || {},
      grandTotal: data.total?.grandTotal || 0, // Will be recalculated
    };

    this.recalculateBaseTotals();
  }

  /**
   * Recalculates the subtotal and mrpTotal based on the current line items.
   * Uses PriceModel for rounding based on the country.
   */
  protected recalculateBaseTotals(): void {
    this.total.subtotal = PriceModel.getRoundedPrice(this.lineItems.reduce((sum, item) => sum + item.getPriceTotals().subtotal, 0), this.country);
    this.total.mrpTotal = PriceModel.getRoundedPrice(this.lineItems.reduce((sum, item) => sum + item.getPriceTotals().mrpTotal, 0), this.country);
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
   * Gets current number of line items in the container
   * @returns 
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
    return this.coupons.map(coupon => new CouponModel(coupon.getDetails()));
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
    return  { ...this.total, couponTotal: { ...this.total.couponTotal } };
  }

  /**
   * Calculates the discount value for a given coupon based on the current container state.
   * Returns 0 if the coupon is invalid, expired, or not applicable based on cart value or target category.
   * @param coupon - The CouponModel instance to evaluate.
   * @returns The calculated discount amount (rounded according to country rules).
   */
  public calculateApplicableCouponDiscount(coupon: CouponModel): number {
    // 1. Basic validation (active)
    if (!coupon.isActive()) {
      return 0;
    }

    // 2. Check regional requirements (min cart value, max discount)
    const minCartValueReq = coupon.getMinCartValue(this.country);
    const maxCartDiscountCap = coupon.getMaxCartDiscount(this.country);

    // Ensure minCartValueReq exists and subtotal meets the requirement
    if (!minCartValueReq || this.total.subtotal < minCartValueReq.price) {
      return 0;
    }

    // Ensure maxCartDiscountCap exists and is non-negative
    if (!maxCartDiscountCap || maxCartDiscountCap.price < 0) {
      return 0;
    }

    // 3. Calculate potential discount based on method and category
    const couponCategory = coupon.getCategory();
    const discountMethod = coupon.getDiscountMethod();
    let potentialDiscount = 0;
    // Determine the value the coupon applies to (shipping cost or subtotal)
    const targetValue = couponCategory === CouponCategory.SHIPPING ? this.total.shipping : this.total.subtotal;

    // No discount if the target value is zero or less
    if (targetValue <= 0) return 0;

    switch (discountMethod) {
      case CouponDiscountMethod.FLAT:
        // Flat discount is capped by the target value itself and the max discount cap
        const flatAmount = maxCartDiscountCap?.price ?? 0; // Use cap as the flat amount source? Or coupon.value? Needs clarification. Assuming cap IS the flat amount here.
        potentialDiscount = Math.min(targetValue, flatAmount);
        break;
      case CouponDiscountMethod.PERCENTAGE:
        // Calculate percentage discount based on the target value
        potentialDiscount = targetValue * (coupon.getPercentageValue() / 100);
        break;
      default:
        // Unknown discount method
        return 0;
    }

    // 4. Apply maximum discount cap to the calculated potential discount
    const finalDiscount = Math.min(potentialDiscount, maxCartDiscountCap.price);

    // 5. Round the final discount, ensuring it's not negative
    return PriceModel.getRoundedPrice(Math.max(0, finalDiscount), this.country);
  }

  /**
   * Recalculates the `couponTotal` map based on currently applied coupons.
   * Iterates through coupons, calculates their applicable discount, and stores it.
   * @returns The total discount amount from all valid and applicable coupons (rounded).
   */
  public recalculateCouponTotals(): number {
    this.total.couponTotal = {}; // Reset the map
    let totalDiscount = 0;

    this.coupons.forEach(coupon => {
      const discount = this.calculateApplicableCouponDiscount(coupon);
      if (discount > 0) {
        this.total.couponTotal[coupon.getCode()] = discount; // Store per-coupon discount
        totalDiscount += discount; // Accumulate total discount
      }
    });
    // Return the rounded total discount
    return PriceModel.getRoundedPrice(totalDiscount, this.country);
  }

  /**
  * Recalculates all container totals (subtotal, mrpTotal, coupons, shipping, grandTotal).
  * Should be called whenever line items, coupons, or base shipping cost change.
  */
  public updateCartTotals(): void {
    // 1. Calculate line item totals (subtotal, mrpTotal)
    this.total.subtotal = PriceModel.getRoundedPrice(this.lineItems.reduce((sum, item) => sum + item.getPriceTotals().subtotal, 0), this.country);
    this.total.mrpTotal = PriceModel.getRoundedPrice(this.lineItems.reduce((sum, item) => sum + item.getPriceTotals().mrpTotal, 0), this.country);

    // 2. Calculate total coupon discount and update the per-coupon discount map
    this.recalculateCouponTotals(); // This updates this.total.couponTotal

    // 3. Calculate effective shipping cost after applying shipping-specific coupons
    const shippingCouponDiscount = this.coupons
      .filter(c => c.getCategory() === CouponCategory.SHIPPING)
      .reduce((sum, c) => sum + (this.total.couponTotal[c.getCode()] ?? 0), 0);
    this.total.effectiveShipping = PriceModel.getRoundedPrice(Math.max(0, this.total.shipping - shippingCouponDiscount), this.country);

    // 4. Calculate total discount from non-shipping coupons
    const nonShippingCouponDiscount = this.coupons
      .filter(c => c.getCategory() !== CouponCategory.SHIPPING)
      .reduce((sum, c) => sum + (this.total.couponTotal[c.getCode()] ?? 0), 0);

    // 5. Calculate final grand total: (subtotal + effective shipping) - non-shipping discounts
    const grossTotal = this.total.subtotal + this.total.effectiveShipping;
    this.total.grandTotal = PriceModel.getRoundedPrice(Math.max(0, grossTotal - nonShippingCouponDiscount), this.country);
  }

  /**
  * Updates the shipping details (including estimated cost) for the container and recalculates totals.
  * @param details - The new ShippingDetails object, or null to clear shipping details and cost.
  */
  public setShippingDetails(details: ShippingDetails | null): void {
    // Store a copy of the details or null
    this.shippingDetails = details ? { ...details } : null;

    // Update the base shipping cost based on the new details
    this.total.shipping = PriceModel.getRoundedPrice(this.shippingDetails?.estimatedCost ?? 0, this.country);
    // Recalculate all totals as shipping cost affects effective shipping and grand total
    this.updateCartTotals();
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
       total: this.getTotal(),
       country: this.getCountry(),
       currency: this.getCurrency(),
       locale: this.getLocale(),
     }
   };
}

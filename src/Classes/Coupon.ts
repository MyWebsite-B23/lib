import Utils from "../Utils";
import BaseModel, { BaseAttributes } from "./Base";
import { CountryCode, CurrencyCode, ISODateTimeUTC, LocaleCode, LocalizedString, RegionalPrice } from "./Common";
import { LocaleLanguageMap } from "./Enum";
import { InvalidArgumentError } from "./Error";
import PriceModel, { PriceData } from "./Price";

export enum CouponType {
  COUPON = "coupon",
  AUTOMATIC = "automatic",
}

export enum CouponDiscountMethod {
  FLAT = "flat",
  PERCENTAGE = "percentage",
}

export enum CouponCategory {
  SHIPPING = "SHIPPING",
  CUSTOMER = "CUSTOMER",
}

export enum ApplicableTo {
  ALL = "all",
  FTB = "ftb",
}

export type CouponAttribute = BaseAttributes & {
  couponCode: string;
  name: LocalizedString;
  description: LocalizedString;
  type: CouponType;
  customerId?: string;
  validFrom: ISODateTimeUTC;
  validTo: ISODateTimeUTC;
  minCartValue: RegionalPrice;
  maxCartDiscount: RegionalPrice;
  discountMethod: CouponDiscountMethod;
  percentageValue?: number;
  applicableTo: ApplicableTo;
  category: CouponCategory;
};

export type CouponData = Required<CouponAttribute>

/**
 * Represents a discount coupon, extending BaseModel.
 */
export default class CouponModel extends BaseModel {
  protected couponCode: string;
  protected name: LocalizedString;
  protected description: LocalizedString;
  protected type: CouponType;
  protected customerId?: string;
  protected validFrom: ISODateTimeUTC;
  protected validTo: ISODateTimeUTC;
  protected minCartValue: {
    [country in CountryCode]?: PriceModel;
  };
  protected maxCartDiscount: {
    [country in CountryCode]?: PriceModel;
  };
  protected discountMethod: CouponDiscountMethod;
  protected percentageValue: number;
  protected applicableTo: ApplicableTo;
  protected category: CouponCategory;

  /**
   * Creates an instance of CouponModel.
   * @param data - The initial coupon attributes.
   * @param date - Optional date for setting creation/modification times (defaults to now).
   */
  constructor(data: CouponAttribute, date: Date = new Date()) {
    super(data, date);

    this.couponCode = data.couponCode;
    this.name = Utils.deepClone(data.name);
    this.description = Utils.deepClone(data.description);
    this.type = data.type;
    this.customerId = data.customerId;
    this.validFrom = data.validFrom && Date.parse(data.validFrom) ? new Date(data.validFrom).toISOString() : date.toISOString();
    this.validTo = data.validTo && Date.parse(data.validTo) ? new Date(data.validTo).toISOString() : date.toISOString();
    this.minCartValue = (Object.keys(data.minCartValue) as CountryCode[]).reduce((acc, country) => {
      const priceData = data.minCartValue[country] as PriceData;
      if (priceData) {
        acc[country] = new PriceModel(priceData);
      }
      return acc;
    }, {} as { [country in CountryCode]?: PriceModel });
    this.maxCartDiscount = (Object.keys(data.maxCartDiscount) as CountryCode[]).reduce((acc, country) => {
      const priceData = data.maxCartDiscount[country] as PriceData;
      if (priceData) {
        acc[country] = new PriceModel(priceData);
      }
      return acc;
    }, {} as { [country in CountryCode]?: PriceModel });
    this.discountMethod = data.discountMethod;
    this.percentageValue = data.percentageValue ?? 0;
    if (this.percentageValue > 100) {
      throw new InvalidArgumentError('Percentage value cannot be greater than 100');
    }

    this.applicableTo = data.applicableTo;
    this.category = data.category;
  }

  /** Gets the unique coupon code. */
  getCode(): string {
    return this.couponCode;
  }

  /**
   * Gets the full localized coupon name object.
   * @returns A copy of the LocalizedString object for the name.
   */
  getName(): LocalizedString
  /**
   * Gets the coupon name for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The name string for the specified locale.
   */
  getName(locale: LocaleCode): string
  getName(locale?: LocaleCode): LocalizedString | string {
    if (locale) {
      return this.name[locale] ?? this.name[LocaleLanguageMap[locale]] ?? this.name.en;
    } else {
      return { ...this.name };
    }
  }

  /**
   * Gets the full localized coupon description object.
   * @returns A copy of the LocalizedString object for the description, or undefined.
   */
  getDescription(): LocalizedString
  /**
   * Gets the coupon description for a specific locale, falling back to English ('en').
   * @param locale - The desired locale code.
   * @returns The description string for the specified locale.
   */
  getDescription(locale: LocaleCode): string
  getDescription(locale?: LocaleCode): LocalizedString | string {
    if (locale) {
      return this.description[locale] ?? this.description[LocaleLanguageMap[locale]] ?? this.description.en;
    } else {
      return { ...this.description };
    }
  }

  /** Gets the type of coupon (COUPON or AUTOMATIC). */
  getType(): CouponType {
    return this.type;
  }

  /** Gets the specific customer ID this coupon is limited to, if any. */
  getCustomerId(): string {
    return this.customerId ?? '';
  }

  /** Gets the ISO date string from when the coupon is valid. */
  getValidFrom(): ISODateTimeUTC {
    return this.validFrom;
  }

  /** Gets the ISO date string until when the coupon is valid. */
  getValidTo(): ISODateTimeUTC {
    return this.validTo;
  }

  /**
   * Gets the list of minimum cart values required for the coupon across different regions.
   * Returns copies of the price objects.
   * @returns The full list of regional minimum cart values.
   */
  getMinCartValue(): { [country in CountryCode]?: PriceModel }

  /**
   * Gets the minimum cart value required for the coupon for a specific country.
   * @param country - The country code to filter the minimum value for.
   * @returns The regional minimum cart value for the specified country, or undefined if not set for that country.
   */
  getMinCartValue(country: CountryCode): PriceModel | undefined
  getMinCartValue(country?: CountryCode) {
    if (country) {
      return this.minCartValue[country];
    }
    return { ...this.minCartValue };
  }

  /**
  * Gets the list of maximum discount amounts allowed for the coupon across different regions.
  * Returns copies of the price objects.
  * @returns The full list of regional maximum discount caps.
  */
  getMaxCartDiscount(): { [country in CountryCode]?: PriceModel }
  /**
   * Gets the maximum discount amount allowed for the coupon for a specific country.
   * @param country - The country code to filter the maximum discount for.
   * @returns The regional maximum discount cap for the specified country, or undefined if not set for that country.
   */
  getMaxCartDiscount(country: CountryCode): PriceModel | undefined
  getMaxCartDiscount(country?: CountryCode) {
    if (country) {
      return this.maxCartDiscount[country];
    }
    return { ...this.maxCartDiscount };
  }

  /** Gets the discount method (FLAT or PERCENTAGE). */
  getDiscountMethod(): CouponDiscountMethod {
    return this.discountMethod;
  }

  /** Gets the percentage discount value (0-100). */
  getPercentageValue(): number {
    return this.percentageValue;
  }

  /** Gets the customer applicability rule (ALL or FTB). */
  getApplicableTo(): ApplicableTo {
    return this.applicableTo;
  }

  /** Gets the category of the coupon (SHIPPING or CUSTOMER). */
  getCategory(): CouponCategory {
    return this.category;
  }

  /**
   * Gets a plain data object representing the coupon's details.
   * @returns A CouponData object.
   */
  getDetails(): CouponData {
    return {
      ...super.getDetails(),
      couponCode: this.getCode(),
      name: this.getName(),
      description: this.getDescription(),
      type: this.getType(),
      customerId: this.getCustomerId(),
      validFrom: this.getValidFrom(),
      validTo: this.getValidTo(),
      minCartValue: (Object.keys(this.getMinCartValue()) as CountryCode[]).reduce((acc, country) => {
        const priceModel = this.getMinCartValue(country);
        if (priceModel) {
          acc[country] = priceModel.getDetails();
        }
        return acc;
      }, {} as RegionalPrice),
      maxCartDiscount: (Object.keys(this.getMaxCartDiscount()) as CountryCode[]).reduce((acc, country) => {
        const priceModel = this.getMaxCartDiscount(country);
        if (priceModel) {
          acc[country] = priceModel.getDetails();
        }
        return acc;
      }, {} as RegionalPrice),
      discountMethod: this.getDiscountMethod(),
      percentageValue: this.getPercentageValue(),
      applicableTo: this.getApplicableTo(),
      category: this.getCategory(),
    };
  }

  /**
  * Checks if the coupon is currently active based on its validity dates.
  * @returns True if the coupon is currently within its validity period, false otherwise.
  */
  isActive(): boolean {
    return new Date(this.validFrom) <= new Date() && new Date(this.validTo) >= new Date();
  }


  /**
   * Checks if the coupon is applicable to a customer based on their status (e.g., first-time buyer).
   * @param ftbCustomer - A boolean indicating whether the customer is a first-time buyer.
   * @returns True if the coupon's applicability rule matches the customer's status, false otherwise.
   */
  isApplicableTo(ftbCustomer: boolean): boolean {
    return this.applicableTo === ApplicableTo.ALL || (this.applicableTo === ApplicableTo.FTB && ftbCustomer);
  }

      /**
   * Calculates the discount value for a given coupon based on the current container state.
   * Returns 0 if the coupon is invalid, expired, or not applicable based on cart value or target category.
   * @param cartValue - The cart subtotal as a PriceModel.
   * @param shippingCost - The cart shipping cost.
   * @param country - The country code.
   * @param currency - The currency code.
   * @returns The calculated discount amount (rounded according to country rules).
   */
  public calculateApplicableCouponDiscount(cartValue: PriceModel, shippingCost: PriceModel, country: CountryCode, currency: CurrencyCode, checkExpiry: boolean = true): PriceModel {
    let zeroDiscount: PriceModel = new PriceModel({ amount: 0, currency });
    let potentialDiscount: PriceModel;

    // 1. Basic validation (active)
    if (checkExpiry && !this.isActive()) {
      return zeroDiscount;
    }

    // 2. Check regional requirements (min cart value, max discount)
    const minCartValueReq = this.getMinCartValue(country);
    const maxCartDiscountCap = this.getMaxCartDiscount(country);

    // If minCartValueReq is not set or the cart value is less than the minimum required, return zero discount
    if (!minCartValueReq || minCartValueReq.compareTo(cartValue) > 0) {
      return zeroDiscount;
    }

    // If maxCartDiscountCap is not set, return zero discount
    if (!maxCartDiscountCap) {
      return zeroDiscount;
    }

    // 3. Calculate potential discount based on method and category
    const couponCategory = this.getCategory();
    const discountMethod = this.getDiscountMethod();
    // Determine the value the coupon applies to (shipping cost or subtotal)
    const targetValue = couponCategory === CouponCategory.SHIPPING ? shippingCost : cartValue;

    // No discount if the target value is zero or less
    if (targetValue.getAmount() <= 0) return zeroDiscount;

    switch (discountMethod) {
      case CouponDiscountMethod.FLAT:
        // Flat discount is capped by the target value itself and the max discount cap
        const flatAmount = maxCartDiscountCap; // Use cap as the flat amount source? Or coupon.value? Needs clarification. Assuming cap IS the flat amount here.
        potentialDiscount = targetValue.min(flatAmount);
        break;
      case CouponDiscountMethod.PERCENTAGE:
        // Calculate percentage discount based on the target value
        potentialDiscount = targetValue.multiply(this.getPercentageValue() / 100).round();
        break;
      default:
        // Unknown discount method
        return zeroDiscount;
    }

    // 4. Apply maximum discount cap to the calculated potential discount
    const finalDiscount = potentialDiscount.min(maxCartDiscountCap);

    return finalDiscount;
  }
}

import BaseModel, { BaseAttributes } from "./Base";
import { CountryCode, ISODateTime, LocaleCode, LocalizedString, RegionalPrice, RegionalPriceList } from "./Common";
import { LocaleLanguageMap } from "./Enum";

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
  validFrom: ISODateTime;
  validTo: ISODateTime;
  minCartValue: RegionalPriceList;
  maxCartDiscount: RegionalPriceList;
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
  protected validFrom: ISODateTime;
  protected validTo: ISODateTime;
  protected minCartValue: RegionalPriceList;
  protected maxCartDiscount: RegionalPriceList;
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
    this.name = { ...data.name };
    this.description = { ...data.description };
    this.type = data.type;
    this.customerId = data.customerId;
    this.validFrom = data.validFrom && Date.parse(data.validFrom) ? new Date(data.validFrom).toISOString() : date.toISOString();
    this.validTo = data.validTo && Date.parse(data.validTo) ? new Date(data.validTo).toISOString() : date.toISOString();
    this.minCartValue = data.minCartValue.map(price => ({ ...price }));
    this.maxCartDiscount = data.maxCartDiscount.map(price => ({ ...price }));
    this.discountMethod = data.discountMethod;
    this.percentageValue = data.percentageValue ?? 0;
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
  getValidFrom(): ISODateTime {
    return this.validFrom;
  }

  /** Gets the ISO date string until when the coupon is valid. */
  getValidTo(): ISODateTime {
    return this.validTo;
  }

  /**
   * Gets the list of minimum cart values required for the coupon across different regions.
   * Returns copies of the price objects.
   * @returns The full list of regional minimum cart values.
   */
  getMinCartValue(): RegionalPriceList
  /**
   * Gets the minimum cart value required for the coupon for a specific country.
   * @param country - The country code to filter the minimum value for.
   * @returns The regional minimum cart value for the specified country, or undefined if not set for that country.
   */
  getMinCartValue(country: CountryCode): RegionalPrice | undefined
  getMinCartValue(country?: CountryCode){
    if(country) {
      return this.minCartValue.find(price => price.country === country);
    }
    return this.minCartValue;
  }

   /**
   * Gets the list of maximum discount amounts allowed for the coupon across different regions.
   * Returns copies of the price objects.
   * @returns The full list of regional maximum discount caps.
   */
   getMaxCartDiscount(): RegionalPriceList
   /**
    * Gets the maximum discount amount allowed for the coupon for a specific country.
    * @param country - The country code to filter the maximum discount for.
    * @returns The regional maximum discount cap for the specified country, or undefined if not set for that country.
    */
  getMaxCartDiscount(country: CountryCode): RegionalPrice | undefined
  getMaxCartDiscount(country?: CountryCode){
    if(country) {
      return this.maxCartDiscount.find(price => price.country === country);
    }
    return this.maxCartDiscount;
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
        minCartValue: this.getMinCartValue(),
        maxCartDiscount: this.getMaxCartDiscount(),
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
}
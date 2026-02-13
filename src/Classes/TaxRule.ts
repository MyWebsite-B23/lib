import { CustomFieldAttributes, CustomFieldModel } from "./Base";
import { CountryCode, ISODateTimeUTC, Prettify } from "./Common";
import { TaxSystem } from "./Enum";
import PriceModel, { PriceData } from "./Price";

export type TaxRuleAttributes = Prettify<CustomFieldAttributes & {
  taxRuleId: string;
  taxCategory: string;
  taxSystem: TaxSystem;
  taxSubSystem: string;
  country: CountryCode;
  rate: number;
  minPrice: PriceData;
  maxPrice?: PriceData;
  excludeMin?: boolean;
  excludeMax?: boolean;
  effectiveFrom: ISODateTimeUTC;
  effectiveTo?: ISODateTimeUTC;
}>;

export type TaxRuleData = TaxRuleAttributes;

export class TaxRuleModel extends CustomFieldModel{
  protected taxRuleId: string;
  protected taxCategory: string;
  protected taxSystem: TaxSystem;
  protected taxSubSystem: string;
  protected country: CountryCode;
  protected rate: number;
  protected minPrice: PriceModel;
  protected maxPrice?: PriceModel;
  protected excludeMin: boolean;
  protected excludeMax: boolean;
  protected effectiveFrom: ISODateTimeUTC;
  protected effectiveTo?: ISODateTimeUTC;

  constructor(data: TaxRuleAttributes) {
    super(data);
    this.taxRuleId = data.taxRuleId;
    this.taxSystem = data.taxSystem;
    this.taxSubSystem = data.taxSubSystem;
    this.taxCategory = data.taxCategory;
    this.country = data.country;
    this.rate = data.rate;
    this.minPrice = new PriceModel(data.minPrice);
    this.maxPrice = data.maxPrice ? new PriceModel(data.maxPrice) : undefined;
    this.excludeMin = data.excludeMin ?? false;
    this.excludeMax = data.excludeMax ?? false;
    this.effectiveFrom = new Date(data.effectiveFrom).toISOString();
    this.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo).toISOString() : undefined;
  }

  getTaxRuleId(): string {
    return this.taxRuleId;
  }

  getTaxSystem(): TaxSystem {
    return this.taxSystem;
  }

  getTaxSubSystem(): string {
    return this.taxSubSystem;
  }

  getTaxCategory(): string {
    return this.taxCategory;
  }

  getCountry(): CountryCode {
    return this.country;
  }

  getRate(): number {
    return this.rate;
  }

  getMinPrice(): PriceModel {
    return this.minPrice;
  }

  getMaxPrice(): PriceModel | undefined {
    return this.maxPrice;
  }

  getExcludeMin(): boolean {
    return this.excludeMin;
  }

  getExcludeMax(): boolean {
    return this.excludeMax;
  }

  getEffectiveFrom(): string {
    return this.effectiveFrom;
  }

  getEffectiveTo(): string | undefined {
    return this.effectiveTo;
  }

  getDetails(): TaxRuleData {
    return {
      taxRuleId: this.getTaxRuleId(),
      taxSystem: this.getTaxSystem(),
      taxSubSystem: this.getTaxSubSystem(),
      taxCategory: this.getTaxCategory(),
      country: this.getCountry(),
      rate: this.getRate(),
      minPrice: this.getMinPrice().getDetails(),
      maxPrice: this.getMaxPrice()?.getDetails(),
      excludeMin: this.getExcludeMin(),
      excludeMax: this.getExcludeMax(),
      effectiveFrom: this.effectiveFrom,
      effectiveTo: this.effectiveTo ? this.effectiveTo : undefined,
      customFields: this.getAllCustomFields(),
    };
  }

  /**
   * Checks whether this tax rule is applicable for the given category and country at a specific time.
   * @param taxCategory - The tax category to check.
   * @param country - The country code to check.
   * @param price - The price to check against the rule's price range (optional).
   * @param at - The date to check effectiveness against (defaults to now).
   * @returns True if the rule is applicable, false otherwise.
   */
  appliesTo(taxCategory: string, country: CountryCode, price?: PriceModel, at: Date = new Date()): boolean {
    const isPriceInRange = !price || (
      (this.excludeMin ? this.minPrice.compareTo(price) < 0 : this.minPrice.compareTo(price) <= 0) &&
      (this.maxPrice
        ? (this.excludeMax ? this.maxPrice.compareTo(price) > 0 : this.maxPrice.compareTo(price) >= 0)
        : true
      )
    );

    return (
      this.taxCategory === taxCategory &&
      this.country === country &&
      isPriceInRange &&
      Date.parse(this.effectiveFrom) <= at.getTime() &&
      (this.effectiveTo ? Date.parse(this.effectiveTo) >= at.getTime() : true)
    );
  }

  /**
   * Gets the applicable tax rate for a given price. Returns the tax rate if the rule applies, otherwise returns 0.
   * @param price - The price to check against the tax rule.
   * @returns The applicable tax rate as a decimal (e.g., 0.18 for 18%).
   */
  getApplicableTaxRate(price: PriceModel): number {
    if(this.appliesTo(this.taxCategory, this.country, price)) {
      return this.rate;
    }
    return 0;
  }

  /**
   * Calculates the tax amount for a given taxable amount.
   * @param price - The price used to determine the tax amount.
   * @returns The calculated tax amount as a PriceModel. Returns zero if the tax rule does not apply.
   */
  calculateTax(price: PriceModel): PriceModel {
    if(!this.appliesTo(this.taxCategory, this.country, price)) {
      return price.zero(); // Return zero tax if the rule does not apply
    }

    return price.multiply(this.rate);
  }


  static getTaxRateDisplayString(taxRule: TaxRuleModel, rate: number, formateOption?: {
    percentageOnly?: boolean;
  }): string {
    const percentage = rate * 100;
    // Format to remove trailing zeros if it's an integer, otherwise keep up to 2 decimal places
    const rateStr = percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');

    if (formateOption?.percentageOnly) {
      return `${rateStr}%`;
    }

    if (taxRule.getTaxSystem() === TaxSystem.GST) {
      return `${taxRule.getTaxSubSystem()} ${rateStr}%`;
    }
    return `${taxRule.getTaxSystem()} ${rateStr}%`;
  }
}


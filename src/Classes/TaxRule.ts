import Utils from "../Utils";
import BaseModel, { BaseAttributes } from "./Base";
import { CountryCode, ISODateTimeUTC } from "./Common";
import { TaxCategory, TaxSystem } from "./Enum";
import PriceModel from "./Price";
import { TaxSlabNotFoundError } from "./Error";

export type TaxSlab = {
  minUnitPrice: number; // inclusive
  maxUnitPrice?: number; // exclusive
  rate: number; // e.g. 0.05 = 5%
};

export type TaxSlabs = TaxSlab[];

export type TaxRuleAttributes = {
  taxRuleId: string;
  taxSystem: TaxSystem;
  taxCategory: TaxCategory;
  country: CountryCode;
  slabs: TaxSlabs;
  effectiveFrom: ISODateTimeUTC;
  effectiveTo?: ISODateTimeUTC;
} & BaseAttributes;

export type TaxRuleData = Required<Omit<TaxRuleAttributes, 'effectiveFrom' | 'effectiveTo'>> & {
  effectiveFrom: ISODateTimeUTC;
  effectiveTo?: ISODateTimeUTC;
};

export class TaxRuleModel extends BaseModel {
  protected taxRuleId: string;
  protected taxSystem: TaxSystem;
  protected taxCategory: TaxCategory;
  protected country: CountryCode;
  protected slabs: TaxSlab[];
  protected effectiveFrom: Date;
  protected effectiveTo?: Date;

  /**
   * Creates an instance of TaxRuleModel.
   * @param data - The initial tax rule attributes.
   * @param date - Optional date for creation/modification (defaults to now).
   */
  constructor(data: TaxRuleAttributes, date: Date = new Date()) {
    super(data, date);
    this.taxRuleId = data.taxRuleId;
    this.taxSystem = data.taxSystem;
    this.taxCategory = data.taxCategory;
    this.country = data.country;
    this.slabs = Utils.deepClone(data.slabs);
    this.effectiveFrom = new Date(data.effectiveFrom);
    this.effectiveTo = data.effectiveTo ? new Date(data.effectiveTo) : undefined;
  }

  getTaxRuleId(): string {
    return this.taxRuleId;
  }

  getTaxSystem(): TaxSystem {
    return this.taxSystem;
  }

  getTaxCategory(): TaxCategory {
    return this.taxCategory;
  }

  getCountry(): CountryCode {
    return this.country;
  }

  getSlabs(): TaxSlab[] {
    return Utils.deepClone(this.slabs);
  }

  getDetails(): TaxRuleData {
    return {
      taxRuleId: this.getTaxRuleId(),
      taxSystem: this.getTaxSystem(),
      taxCategory: this.getTaxCategory(),
      country: this.getCountry(),
      slabs: this.getSlabs(),
      effectiveFrom: this.effectiveFrom.toISOString(),
      effectiveTo: this.effectiveTo ? this.effectiveTo.toISOString() : undefined,
      ...super.getDetails()
    };
  }

  /**
   * Checks whether this tax rule is applicable for the given category and country at a specific time.
   * @param taxCategory - The tax category to check.
   * @param country - The country code to check.
   * @param at - The date to check effectiveness against (defaults to now).
   * @returns True if the rule is applicable, false otherwise.
   */
  appliesTo(taxCategory: TaxCategory, country: CountryCode, at: Date = new Date()): boolean {
    return (
      this.taxCategory === taxCategory &&
      this.country === country &&
      this.effectiveFrom <= at &&
      (this.effectiveTo ? this.effectiveTo >= at : true)
    );
  }

  /**
   * Calculates the applicable tax rate for a given unit price.
   * @param unitPrice - The unit price to find the matching tax slab for.
   * @returns The tax rate as a decimal (e.g., 0.05 for 5%).
   * @throws {TaxSlabNotFoundError} If no applicable slab or multiple slabs are found.
   */
  getApplicableTaxRate(unitPrice: PriceModel): number {
    return TaxRuleModel.getApplicableTaxRate(unitPrice, this.slabs);
  }

  static getApplicableTaxRate(unitPrice: PriceModel, taxSlabs: TaxSlabs): number {
    const price = unitPrice.getAmount();

    const slabs = taxSlabs.filter(s =>
      (s.minUnitPrice === undefined || price >= s.minUnitPrice) &&
      (s.maxUnitPrice === undefined || price < s.maxUnitPrice)
    );

    if (slabs.length !== 1) {
      throw new TaxSlabNotFoundError();
    }

    return slabs[0].rate;
  }
}

import Utils from "../Utils";
import BaseModel, { BaseAttributes } from "./Base";
import { CountryCode, ISODateTimeUTC } from "./Common";
import { TaxSystem } from "./Enum";
import PriceModel, { PriceData } from "./Price";
import { TaxSlabNotFoundError } from "./Error";

export type TaxRuleBaseAttributes = {
  taxRuleId: string;
  taxCategory: string;
  taxSystem: TaxSystem;
  taxSubSystem: string;
  taxCountry: CountryCode;
  effectiveFrom: ISODateTimeUTC;
  effectiveTo?: ISODateTimeUTC;
}

export type TaxRuleBaseData = TaxRuleBaseAttributes;

export class TaxRuleBaseModel {
  protected taxRuleId: string;
  protected taxCategory: string;
  protected taxSystem: TaxSystem;
  protected taxSubSystem: string;
  protected taxCountry: CountryCode;
  protected effectiveFrom: ISODateTimeUTC;
  protected effectiveTo?: ISODateTimeUTC;

  constructor(data: TaxRuleBaseAttributes) {
    this.taxRuleId = data.taxRuleId;
    this.taxSystem = data.taxSystem;
    this.taxSubSystem = data.taxSubSystem;
    this.taxCategory = data.taxCategory;
    this.taxCountry = data.taxCountry;
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

  getTaxCountry(): CountryCode {
    return this.taxCountry;
  }

  getEffectiveFrom(): string {
    return this.effectiveFrom;
  }

  getEffectiveTo(): string | undefined {
    return this.effectiveTo;
  }

  getDetails(): TaxRuleBaseData {
    return {
      taxRuleId: this.getTaxRuleId(),
      taxSystem: this.getTaxSystem(),
      taxSubSystem: this.getTaxSubSystem(),
      taxCategory: this.getTaxCategory(),
      taxCountry: this.getTaxCountry(),
      effectiveFrom: this.effectiveFrom,
      effectiveTo: this.effectiveTo ? this.effectiveTo : undefined
    };
  }

  /**
   * Checks whether this tax rule is applicable for the given category and taxCountry at a specific time.
   * @param taxCategory - The tax category to check.
   * @param taxCountry - The taxCountry code to check.
   * @param at - The date to check effectiveness against (defaults to now).
   * @returns True if the rule is applicable, false otherwise.
   */
  appliesTo(taxCategory: string, taxCountry: CountryCode, at: Date = new Date()): boolean {
    return (
      this.taxCategory === taxCategory &&
      this.taxCountry === taxCountry &&
      Date.parse(this.effectiveFrom) <= at.getTime() &&
      (this.effectiveTo ? Date.parse(this.effectiveTo) >= at.getTime() : true)
    );
  }

  static getTaxRateDisplayString(taxRule: TaxRuleBaseModel, rate: number, formateOption?: {
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

export type TaxSlabData = {
  minUnitPrice: PriceData; // inclusive
  maxUnitPrice?: PriceData; // exclusive
  rate: number; // e.g. 0.05 = 5%
};

export type TaxSlabModel = {
  minUnitPrice: PriceModel; // inclusive
  maxUnitPrice?: PriceModel; // exclusive
  rate: number; // e.g. 0.05 = 5%
};

export type TaxSlabs = TaxSlabData[];

export type TaxRuleAttributes = TaxRuleBaseAttributes & {
  slabs: TaxSlabs;
};

export type TaxRuleData = TaxRuleAttributes;

export class TaxRuleModel extends TaxRuleBaseModel {
  protected slabs: TaxSlabModel[];

  /**
   * Creates an instance of TaxRuleModel.
   * @param data - The initial tax rule attributes.
   */
  constructor(data: TaxRuleAttributes) {
    super(data)
    this.slabs = data.slabs.map(s => ({
      rate: s.rate,
      minUnitPrice: new PriceModel(s.minUnitPrice),
      maxUnitPrice: s.maxUnitPrice ? new PriceModel(s.maxUnitPrice) : undefined,
    }));
  }

  getSlabs(): TaxSlabModel[] {
    return this.slabs.map(s => ({
      rate: s.rate,
      minUnitPrice: s.minUnitPrice,
      maxUnitPrice: s.maxUnitPrice,
    }));
  }

  getDetails(): TaxRuleData {
    return {
      ...super.getDetails(),
      slabs: this.getSlabs().map(s => ({
        rate: s.rate,
        minUnitPrice: s.minUnitPrice.getDetails(),
        maxUnitPrice: s.maxUnitPrice ? s.maxUnitPrice.getDetails() : undefined,
      })),
    };
  }

  /**
   * Gets the applicable tax rate for the given unit price based on the slabs.
   * @param unitPrice - The unit price to match against slabs.
   * @returns The applicable tax rate as a decimal (e.g., 0.18 for 18%).
   */
  getApplicableTaxRate(unitPrice: PriceModel): number {
    return TaxRuleModel.getApplicableTaxRate(unitPrice, this.slabs);
  }

  /**
   * Calculates the tax amount for a given taxable amount.
   * @param unitPrice - The unit price used to determine which tax slab applies.
   * @returns The calculated tax amount as a PriceModel.
   */
  calculateTax(unitPrice: PriceModel): PriceModel {
    const rate = this.getApplicableTaxRate(unitPrice);
    return unitPrice.multiply(rate);
  }

  /**
   * Calculates the applicable tax rate for a given unit price.
   * @param unitPrice - The unit price to find the matching tax slab for.
   * @returns The tax rate as a decimal (e.g., 0.05 for 5%).
   * @throws {TaxSlabNotFoundError} If no applicable slab or multiple slabs are found.
   */
  static getApplicableTaxRate(unitPrice: PriceModel, taxSlabs: TaxSlabModel[]): number {
    const slabs = taxSlabs.filter(s =>
      (s.minUnitPrice === undefined || unitPrice.compareTo(s.minUnitPrice) >= 0) &&
      (s.maxUnitPrice === undefined || unitPrice.compareTo(s.maxUnitPrice) < 0)
    );

    if (slabs.length !== 1) {
      throw new TaxSlabNotFoundError();
    }

    return slabs[0].rate;
  }
}


export type FixedTaxRuleAttributes = TaxRuleBaseAttributes & {
  rate: number;
}

export type FixedTaxRuleData = FixedTaxRuleAttributes;

/**
 * A specialized version of TaxRuleModel for fixed-rate taxes (single slab).
 * Ideal for components like Charges where slab-based logic is not required.
 */
export class FixedTaxRuleModel extends TaxRuleBaseModel {
  protected rate: number;

  constructor(data: FixedTaxRuleAttributes) {
    super(data);
    this.rate = data.rate;
  }

  public getApplicableTaxRate(): number {
    return this.rate;
  }

  /**
   * Calculates the tax amount for a given taxable amount.
   * @returns The calculated tax amount as a PriceModel.
   */
  calculateTax(unitPrice: PriceModel): PriceModel {
    const rate = this.getApplicableTaxRate();
    return unitPrice.multiply(rate);
  }

  public getDetails(): FixedTaxRuleData {
    return {
      ...super.getDetails(),
      rate: this.getApplicableTaxRate(),
    };
  }
}

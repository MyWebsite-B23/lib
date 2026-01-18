import Utils from "../Utils";
import BaseModel, { BaseAttributes } from "./Base";
import { CountryCode, ISODateTimeUTC } from "./Common";
import { TaxCategory, TaxSystem } from "./Enum";
import PriceModel, { PriceData } from "./Price";
import { TaxSlabNotFoundError } from "./Error";

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

export type TaxRateBreakdown = {
  totalRate: number;
  label: string;
  components: {
    rate: number;
    label: string;
    type: 'IGST' | 'CGST' | 'SGST' | 'GST' | string;
  }[];
};

export type TaxFormattingVariant = 'short' | 'long' | 'detailed' | 'percentageOnly';

export interface TaxFormattingOptions {
  variant?: TaxFormattingVariant;
  includeTaxesSuffix?: boolean; // e.g. "(Incl. Taxes)"
  merchantState?: string;
  customerState?: string;
  multiline?: boolean;
  separator?: string; // custom separator, overrides multiline if provided
}

/**
 * Interface for tax system specific formatting logic.
 */
export interface ITaxSystemFormatter {
  getBreakdown(rate: number, country: CountryCode, options?: TaxFormattingOptions): TaxRateBreakdown;
  getLongName(country: CountryCode): string;
}

/**
 * Formatter for GST (Goods and Services Tax).
 * Handles India-specific components (CGST/SGST/IGST).
 */
export class GSTFormatter implements ITaxSystemFormatter {
  getBreakdown(rate: number, country: CountryCode, options?: TaxFormattingOptions): TaxRateBreakdown {
    const percentage = rate * 100;
    const rateStr = percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');

    if (country === 'IN' && options?.merchantState && options?.customerState) {
      if (options.merchantState.toLowerCase().trim() === options.customerState.toLowerCase().trim()) {
        const splitRate = (percentage / 2) % 1 === 0 ? (percentage / 2).toString() : (percentage / 2).toFixed(2).replace(/\.?0+$/, '');
        return {
          totalRate: rate,
          label: `${splitRate}% CGST + ${splitRate}% SGST`,
          components: [
            { rate: rate / 2, label: `${splitRate}% CGST`, type: 'CGST' },
            { rate: rate / 2, label: `${splitRate}% SGST`, type: 'SGST' }
          ]
        };
      } else {
        return {
          totalRate: rate,
          label: `${rateStr}% IGST`,
          components: [{ rate: rate, label: `${rateStr}% IGST`, type: 'IGST' }]
        };
      }
    }

    return {
      totalRate: rate,
      label: `${rateStr}% GST`,
      components: [{ rate: rate, label: `${rateStr}% GST`, type: 'GST' }]
    };
  }

  getLongName(): string {
    return 'Goods and Services Tax';
  }
}

/**
 * Registry to manage and provide tax formatters.
 */
export const TaxFormatterRegistry: Record<string, ITaxSystemFormatter> = {
  [TaxSystem.GST]: new GSTFormatter(),
};

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
  protected slabs: TaxSlabModel[];
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
    this.slabs = data.slabs.map(s => ({
      rate: s.rate,
      minUnitPrice: new PriceModel(s.minUnitPrice),
      maxUnitPrice: s.maxUnitPrice ? new PriceModel(s.maxUnitPrice) : undefined,
    }));
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

  getSlabs(): TaxSlabModel[] {
    return this.slabs;
  }

  getDetails(): TaxRuleData {
    return {
      taxRuleId: this.getTaxRuleId(),
      taxSystem: this.getTaxSystem(),
      taxCategory: this.getTaxCategory(),
      country: this.getCountry(),
      slabs: this.getSlabs().map(s => ({
        rate: s.rate,
        minUnitPrice: s.minUnitPrice.getDetails(),
        maxUnitPrice: s.maxUnitPrice ? s.maxUnitPrice.getDetails() : undefined,
      })),
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

  /**
   * Returns a user-friendly string representation of the applicable tax rate.
   * Handles legal IGST/CGST/SGST formatting for India if states are provided.
   * @param unitPrice - The unit price to find the matching tax slab for.
   * @param options - Optional states to determine IGST vs CGST/SGST.
   * @returns A string like "18% IGST", "9% CGST + 9% SGST", or "5% GST".
   */
  getTaxRateDisplayString(unitPrice: PriceModel, options?: { merchantState?: string, customerState?: string }): string {
    const rate = this.getApplicableTaxRate(unitPrice);
    return TaxRuleModel.getTaxRateDisplayString(rate, {
      taxSystem: this.taxSystem,
      merchantState: options?.merchantState,
      customerState: options?.customerState
    });
  }

  /**
   * Returns a detailed breakdown of the tax rate into its components (e.g., CGST/SGST).
   */
  getTaxRateBreakdown(unitPrice: PriceModel, options?: TaxFormattingOptions): TaxRateBreakdown {
    const rate = this.getApplicableTaxRate(unitPrice);
    const formatter = TaxFormatterRegistry[this.taxSystem];
    if (formatter) {
      return formatter.getBreakdown(rate, this.country, options);
    }

    // Default fallback
    const percentage = rate * 100;
    const rateStr = percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');
    const label = `${rateStr}% ${this.taxSystem}`;
    return {
      totalRate: rate,
      label: label,
      components: [{ rate, label, type: this.taxSystem }]
    };
  }

  /**
   * Formats a tax rate based on versatile options for UI use cases.
   */
  getFormattedTaxRate(unitPrice: PriceModel, options: TaxFormattingOptions = {}): string {
    const rate = this.getApplicableTaxRate(unitPrice);
    const percentage = rate * 100;
    const rateStr = percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');
    const variant = options.variant || 'short';
    let result = '';

    switch (variant) {
      case 'percentageOnly':
        result = `${rateStr}%`;
        break;
      case 'detailed':
        const breakdown = this.getTaxRateBreakdown(unitPrice, options);
        const separator = options.separator || (options.multiline ? '\n' : ' + ');
        result = breakdown.components.map(c => c.label).join(separator);
        break;
      case 'long':
        const formatter = TaxFormatterRegistry[this.taxSystem];
        const systemLongName = formatter ? formatter.getLongName(this.country) : this.taxSystem.toString();
        result = `${rateStr}% ${systemLongName}`;
        break;
      case 'short':
      default:
        result = `${rateStr}% ${this.taxSystem}`;
        break;
    }

    if (options.includeTaxesSuffix) {
      result += ' (Incl. Taxes)';
    }

    return result;
  }

  /**
   * Static method to find the applicable tax rate from a list of slabs.
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

  /**
   * Static method to format a tax rate as a display string.
   * Handles legal IGST/CGST/SGST formatting for India if states are provided.
   * @param rate - The tax rate as a decimal (e.g., 0.18).
   * @param options - Configuration for tax system name and states.
   * @returns A formatted string.
   */
  static getTaxRateDisplayString(rate: number, options: {
    taxSystem?: string,
    merchantState?: string,
    customerState?: string
  }): string {
    const percentage = rate * 100;
    // Format to remove trailing zeros if it's an integer, otherwise keep up to 2 decimal places
    const rateStr = percentage % 1 === 0 ? percentage.toString() : percentage.toFixed(2).replace(/\.?0+$/, '');

    if (options.taxSystem === TaxSystem.GST && options.merchantState && options.customerState) {
      if (options.merchantState.toLowerCase().trim() === options.customerState.toLowerCase().trim()) {
        const splitRate = (percentage / 2) % 1 === 0 ? (percentage / 2).toString() : (percentage / 2).toFixed(2).replace(/\.?0+$/, '');
        return `${splitRate}% CGST + ${splitRate}% SGST`;
      } else {
        return `${rateStr}% IGST`;
      }
    }

    return options.taxSystem ? `${rateStr}% ${options.taxSystem}` : `${rateStr}%`;
  }
}

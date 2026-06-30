import PriceModel, { PriceData } from "./Price";
import type { SelectionAttributes } from "./Product";
import ProductModel from "./Product";
import {
  InvalidTaxCategoryError,
  InvalidMinQuantityError,
  InvalidTieredPriceError,
  InvalidQuantityError,
  InvalidPricingTypeError,
  NoApplicableTierError
} from "./Error";
import { CurrencyCode, Prettify } from "./Common";

export enum PricingType {
  VOLUME = 'volume',
  SELECTION = 'selection',
}

/**
 * Represents a pricing tier based on a minimum purchase quantity.
 */
export type PriceTier = {
  enabled: boolean;
  minQuantity: number;
  unitPrice: PriceModel;
};

export type PriceTierData = {
  enabled: boolean;
  minQuantity: number;
  unitPrice: PriceData;
};

/**
 * Represents the configuration for a specific selection variant.
 */
export type SelectionPricingData = {
  selectionAttributes: SelectionAttributes;
  baseUnitPrice: PriceData;
  tiers?: PriceTierData[];
};

export type SelectionPricing = {
  selectionAttributes: SelectionAttributes;
  baseUnitPrice: PriceModel;
  tiers: PriceTier[];
};

export type PriceTierAttributes = Prettify<Omit<PriceTierData, 'enabled'> & { enabled?: boolean }>;

/**
 * Represents the attributes required for tiered pricing.
 */
export type TieredPriceAttributes = Prettify<{
  taxCategory: string;
  isTaxInclusive?: boolean;
} & ({
  currency?: CurrencyCode;
  type?: PricingType.VOLUME;
  baseUnitPrice: PriceData;
  tiers?: PriceTierAttributes[];
} | {
  currency: CurrencyCode;
  type: PricingType.SELECTION;
  selections: (Omit<SelectionPricingData, 'tiers'> & { tiers?: PriceTierAttributes[] })[];
})>;

export type TieredPriceData = Prettify<{
  taxCategory: string;
  isTaxInclusive: boolean;
  currency: CurrencyCode;
} & ({
  type?: PricingType.VOLUME;
  baseUnitPrice: PriceData;
  tiers: PriceTierData[];
} | {
  type: PricingType.SELECTION;
  selections: SelectionPricingData[];
})>;

export abstract class TieredPriceModel {
  protected type: PricingType;
  protected taxCategory: string;
  protected isTaxInclusive: boolean;

  /** 
   * Factory method to instantiate the correct concrete TieredPriceModel implementation.
   */
  static create(data: TieredPriceAttributes): TieredPriceModel {
    if (data.type === PricingType.SELECTION) {
      return new SelectionTieredPriceModel(data);
    }
    return new VolumeTieredPriceModel(data);
  }

  constructor(data: TieredPriceAttributes) {
    if (!data.taxCategory) {
      throw new InvalidTaxCategoryError();
    }
    this.taxCategory = data.taxCategory;
    this.isTaxInclusive = data.isTaxInclusive ?? false;
    this.type = data.type ?? PricingType.VOLUME;
  }

  getType(): PricingType {
    return this.type;
  }

  getTaxCategory(): string {
    return this.taxCategory;
  }

  getIsTaxInclusive(): boolean {
    return this.isTaxInclusive;
  }

  abstract getBaseUnitPrice(selectionAttributes?: SelectionAttributes): PriceModel;
  abstract getDetails(): TieredPriceData;
  abstract getCurrency(): string;
  abstract getApplicableUnitPrice(quantity: number, selectionAttributes?: SelectionAttributes): PriceModel;
  abstract getMinQuantity(selectionAttributes?: SelectionAttributes): number;
  abstract getMaxDiscountPercent(selectionAttributes?: SelectionAttributes): number;
}

export class VolumeTieredPriceModel extends TieredPriceModel {
  protected baseUnitPrice: PriceModel;
  protected tiers: PriceTier[];
  protected currency: CurrencyCode;

  constructor(data: Extract<TieredPriceAttributes, { type?: PricingType.VOLUME }>) {
    super(data);
    this.type = PricingType.VOLUME;
    
    if (!data.baseUnitPrice) {
      throw new InvalidTieredPriceError("Base unit price is required for volume pricing.");
    }
    this.baseUnitPrice = new PriceModel(data.baseUnitPrice);
    this.currency = data.currency ?? this.baseUnitPrice.getCurrency();

    const tiers = (data.tiers ?? [])
      .map(tier => ({
        enabled: tier.enabled ?? true,
        minQuantity: tier.minQuantity,
        unitPrice: new PriceModel(tier.unitPrice),
      }))
      .sort((a, b) => a.minQuantity - b.minQuantity);

    const hasInvalidMinQuantity = tiers.some(t => t.minQuantity <= 0);
    if (hasInvalidMinQuantity) {
      throw new InvalidMinQuantityError();
    }

    const hasDifferentCurrency = this.baseUnitPrice.getCurrency() !== this.currency || tiers.some(
      t => t.unitPrice.getCurrency() !== this.currency
    );
    const hasIrregularPricing = tiers.some(
      (tier, index) =>
        index > 0 &&
        tier.unitPrice.compareTo(tiers[index - 1].unitPrice) > 0
    );
    const basePriceExceedsFirstTier = tiers[0]?.unitPrice.compareTo(this.baseUnitPrice) > 0;

    if (hasDifferentCurrency || hasIrregularPricing || basePriceExceedsFirstTier) {
      throw new InvalidTieredPriceError(
        "Tiers must share the same currency and must not increase in unit price."
      );
    }

    this.tiers = tiers;
  }

  getBaseUnitPrice(): PriceModel {
    return this.baseUnitPrice;
  }

  getCurrency(): string {
    return this.baseUnitPrice.getCurrency();
  }

  getApplicableUnitPrice(quantity: number): PriceModel {
    if (quantity <= 0) {
      throw new InvalidQuantityError();
    }

    const enabledTiers = this.tiers.filter(t => t.enabled);
    for (let i = enabledTiers.length - 1; i >= 0; i--) {
        const tier = enabledTiers[i];
        if (quantity >= tier.minQuantity) {
            return tier.unitPrice;
        }
    }

    throw new NoApplicableTierError(quantity);
  }

  getMinQuantity(): number {
    const enabledTiers = this.tiers.filter(tier => tier.enabled);
    return enabledTiers[0]?.minQuantity ?? 1;
  }

  getMaxDiscountPercent(): number {
    const enabledTiers = this.tiers.filter(tier => tier.enabled);
    if (!enabledTiers.length) return 0;
    
    const minTierPrice = Math.min(...enabledTiers.map(t => t.unitPrice.getAmount()));
    const basePrice = this.baseUnitPrice.getAmount();
    
    const discount = ((basePrice - minTierPrice) / basePrice) * 100;
    return discount > 0 ? discount : 0;
  }

  getDetails(): TieredPriceData {
    return {
      type: this.type as PricingType.VOLUME,
      taxCategory: this.taxCategory,
      isTaxInclusive: this.isTaxInclusive,
      currency: this.currency,
      baseUnitPrice: this.baseUnitPrice.getDetails(),
      tiers: this.tiers.map(tier => ({
        enabled: tier.enabled,
        minQuantity: tier.minQuantity,
        unitPrice: tier.unitPrice.getDetails()
      }))
    };
  }
}

export class SelectionTieredPriceModel extends TieredPriceModel {
  protected currency: CurrencyCode;
  protected selections: SelectionPricing[];

  constructor(data: Extract<TieredPriceAttributes, { type: PricingType.SELECTION }>) {
    super(data);
    this.type = PricingType.SELECTION;
    this.currency = data.currency;

    this.selections = (data.selections ?? []).map(selection => {
      if (!selection.baseUnitPrice) {
        throw new InvalidTieredPriceError("Base unit price is required for each selection.");
      }
      const baseUnitPrice = new PriceModel(selection.baseUnitPrice);

      const tiers = (selection.tiers ?? [])
        .map(tier => ({
          enabled: tier.enabled ?? true,
          minQuantity: tier.minQuantity ?? 1,
          unitPrice: new PriceModel(tier.unitPrice),
        }))
        .sort((a, b) => a.minQuantity - b.minQuantity);

      const hasInvalidMinQuantity = tiers.some(t => t.minQuantity <= 0);
      if (hasInvalidMinQuantity) {
        throw new InvalidMinQuantityError();
      }

      const hasDifferentCurrency = baseUnitPrice.getCurrency() !== this.currency || tiers.some(
        t => t.unitPrice.getCurrency() !== this.currency
      );
      const hasIrregularPricing = tiers.some(
        (tier, index) =>
          index > 0 &&
          tier.unitPrice.compareTo(tiers[index - 1].unitPrice) > 0
      );
      const basePriceExceedsFirstTier = tiers[0]?.unitPrice.compareTo(baseUnitPrice) > 0;

      if (hasDifferentCurrency || hasIrregularPricing || basePriceExceedsFirstTier) {
        throw new InvalidTieredPriceError(
          "Tiers must share the same currency and must not increase in unit price within the same selection."
        );
      }

      return {
        selectionAttributes: { ...selection.selectionAttributes },
        baseUnitPrice,
        tiers
      };
    });
  }

  protected findMatch(selectionAttributes: SelectionAttributes): SelectionPricing {
    const key = ProductModel.generateSelectionAttributesKey(selectionAttributes);
    const match = this.selections.find(
      s => ProductModel.generateSelectionAttributesKey(s.selectionAttributes) === key
    );
    if (!match) {
      throw new InvalidTieredPriceError(`No pricing configuration found for selection variant.`);
    }
    return match;
  }

  getBaseUnitPrice(selectionAttributes?: SelectionAttributes): PriceModel {
    if (!selectionAttributes) {
      throw new InvalidPricingTypeError("Selection attributes are required to get base unit price for selection pricing.");
    }
    return this.findMatch(selectionAttributes).baseUnitPrice;
  }

  getCurrency(): string {
    return this.currency;
  }

  getApplicableUnitPrice(quantity: number, selectionAttributes?: SelectionAttributes): PriceModel {
    if (quantity <= 0) {
      throw new InvalidQuantityError();
    }
    if (!selectionAttributes) {
      throw new InvalidPricingTypeError("Selection attributes are required to get applicable unit price for selection pricing.");
    }
    
    const match = this.findMatch(selectionAttributes);

    const enabledTiers = match.tiers.filter(t => t.enabled);
    for (let i = enabledTiers.length - 1; i >= 0; i--) {
        const tier = enabledTiers[i];
        if (quantity >= tier.minQuantity) {
            return tier.unitPrice;
        }
    }
    throw new NoApplicableTierError(quantity);
  }

  getMinQuantity(selectionAttributes?: SelectionAttributes): number {
    if (!selectionAttributes) {
      throw new InvalidPricingTypeError("Selection attributes are required to get min quantity for selection pricing.");
    }
    const match = this.findMatch(selectionAttributes);
    const enabledTiers = match.tiers.filter(t => t.enabled);
    return enabledTiers[0]?.minQuantity ?? 1;
  }

  getMaxDiscountPercent(selectionAttributes?: SelectionAttributes): number {
    if (!selectionAttributes) {
      throw new InvalidPricingTypeError("Selection attributes are required to get max discount for selection pricing.");
    }
    const match = this.findMatch(selectionAttributes);

    const enabledTiers = match.tiers.filter(t => t.enabled);
    if (!enabledTiers.length) return 0;

    const minTierPrice = Math.min(...enabledTiers.map(t => t.unitPrice.getAmount()));
    const basePrice = match.baseUnitPrice.getAmount();
    
    const discount = ((basePrice - minTierPrice) / basePrice) * 100;
    return discount > 0 ? discount : 0;
  }

  getDetails(): TieredPriceData {
    return {
      type: this.type as PricingType.SELECTION,
      taxCategory: this.taxCategory,
      isTaxInclusive: this.isTaxInclusive,
      currency: this.currency,
      selections: this.selections.map(selection => ({
        selectionAttributes: selection.selectionAttributes,
        baseUnitPrice: selection.baseUnitPrice.getDetails(),
        ...(selection.tiers.length > 0 ? {
          tiers: selection.tiers.map(tier => ({
            enabled: tier.enabled,
            minQuantity: tier.minQuantity,
            unitPrice: tier.unitPrice.getDetails()
          }))
        } : {})
      }))
    };
  }
}

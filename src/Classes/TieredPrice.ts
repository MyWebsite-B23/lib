import { TaxCategory } from "./Enum";
import PriceModel, { PriceData } from "./Price";
import {
  InvalidTaxCategoryError,
  InvalidMinQuantityError,
  InvalidTieredPriceError,
  InvalidQuantityError,
  NoApplicableTierError
} from "./Error";

/**
 * Represents a pricing tier based on a minimum purchase quantity.
 */
export type PriceTier = {
  minQuantity: number;
  unitPrice: PriceModel;
};

/**
 * Represents the attributes required for tiered pricing.
 */
export type TieredPriceAttributes = {
  baseUnitPrice: PriceData;
  taxCategory: TaxCategory;

  /** Quantity-based pricing tiers */
  tiers: {
    minQuantity: number;
    unitPrice: PriceData;
  }[];
};

export type TieredPriceData = TieredPriceAttributes;

export class TieredPriceModel {
  protected baseUnitPrice: PriceModel;
  protected taxCategory: TaxCategory;
  protected tiers: PriceTier[];

  /** Constructor
   * Initializes the tiered pricing model with the provided attributes.
   * @param data - The tiered pricing attributes.
   *
   * @throws {Error}
   * - If the tax category is not valid
   * - If any tier has an invalid minimum quantity or unit price
   * - If the base unit price is not valid
   */
  constructor(data: TieredPriceAttributes) {
    const baseUnitPrice = new PriceModel(data.baseUnitPrice);

    if (!data.taxCategory) {
      throw new InvalidTaxCategoryError();
    }

    const tiers = (data.tiers ?? [])
      .map(tier => ({
        minQuantity: tier.minQuantity,
        unitPrice: new PriceModel(tier.unitPrice),
      }))
      .sort((a, b) => a.minQuantity - b.minQuantity);

    const hasInvalidMinQuantity = tiers.some(t => t.minQuantity <= 0);
    if (hasInvalidMinQuantity) {
      throw new InvalidMinQuantityError();
    }

    const hasDifferentCurrency = tiers.some(
      t => t.unitPrice.getCurrency() !== baseUnitPrice.getCurrency()
    );
    const hasIrregularPricing = tiers.some(
      (tier, index) =>
        index > 0 &&
        tier.unitPrice.compareTo(tiers[index - 1].unitPrice) > 0
    );
    const basePriceExceedsFirstTier = tiers[0]?.unitPrice.compareTo(baseUnitPrice) > 0;

    if (hasDifferentCurrency || hasIrregularPricing || basePriceExceedsFirstTier) {
      throw new InvalidTieredPriceError(
        "Tiers must share the same currency and must not increase in unit price."
      );
    }

    this.baseUnitPrice = baseUnitPrice;
    this.taxCategory = data.taxCategory;
    this.tiers = tiers;
  }

  /** 
   * Returns the base unit price 
   * @returns The base unit price as a PriceModel instance.
   */
  getBaseUnitPrice(): PriceModel {
    return this.baseUnitPrice;
  }

  /** 
   * Returns the tax category 
   * @returns The tax category as a TaxCategory enum value.
   */
  getTaxCategory(): TaxCategory {
    return this.taxCategory;
  }

  /** 
   * Returns all pricing tiers sorted by minimum quantity 
   * @returns An array of PriceTier objects.
   */
  getTiers(): readonly PriceTier[] {
    return this.tiers;
  }

  getDetails(): TieredPriceData {
    return {
      baseUnitPrice: this.baseUnitPrice.getDetails(),
      taxCategory: this.taxCategory,
      tiers: this.tiers.map(tier => ({
        minQuantity: tier.minQuantity,
        unitPrice: tier.unitPrice.getDetails()
      }))
    };
  }

  /**
   * Returns the applicable unit price for a given quantity.
   *
   * @param quantity - Purchase quantity
   * @returns The unit price for the highest applicable tier
   *
   * @throws {Error}
   * - If quantity is less than or equal to zero
   * - If quantity does not meet the minimum requirement of any tier
   */
  getApplicableTier(quantity: number): PriceTier {
    if (quantity <= 0) {
      throw new InvalidQuantityError();
    }

    for (let i = this.tiers.length - 1; i >= 0; i--) {
      if (quantity >= this.tiers[i].minQuantity) {
        return this.tiers[i];
      }
    }

    throw new NoApplicableTierError(quantity);
  }

  /**
   * Returns the minimum quantity required to purchase this product.
   */
  getMinQuantity(): number {
    return this.tiers[0]?.minQuantity ?? 1;
  }

  /**
   * Returns the maximum discount percentage achievable compared to the base unit price.
   */
  getMaxDiscountPercent(): number {
    if (!this.tiers.length) return 0;

    const lowestTierPrice = this.tiers[this.tiers.length - 1].unitPrice.getAmount();
    const basePrice = this.baseUnitPrice.getAmount();

    return ((basePrice - lowestTierPrice) / basePrice) * 100;
  }
}

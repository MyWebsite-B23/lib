import BaseModel, { BaseAttributes, BaseData, CustomFieldAttributes, CustomFieldModel } from "./Base";
import Utils from "../Utils";
import { LocaleCode, LocalizedString } from "./Common";
import { ChargeImpact, ChargeTaxTreatment, ChargeType, LocaleLanguageMap, TaxSystem } from "./Enum";
import { InvalidChargeError, InvalidTaxRuleError } from "./Error";
import PriceModel, { PriceData } from "./Price";
import { FixedTaxRuleData, FixedTaxRuleModel } from "./TaxRule";
import CouponModel from "./Coupon";

export type ChargePricing = {
    price: PriceData;
    taxCategory: string;
    applicableTaxRule: FixedTaxRuleData[];
};

export type ChargeTaxBreakdown = {
    rate: number;
    taxablePrice: PriceData;
    amount: PriceData;
    system: TaxSystem;
    subSystem: string;
};

export type ChargeTaxBreakdownModel = {
    rate: number;
    taxablePrice: PriceModel;
    amount: PriceModel;
    system: TaxSystem;
    subSystem: string;
};

export type ChargeTotals = {
    price: PriceData;
    discounts: Record<string, PriceData>;
    totalDiscount: PriceData;
    netPrice: PriceData;
    taxBreakdown: Record<string, ChargeTaxBreakdown>;
    taxTotal: PriceData;
    grandTotal: PriceData;
};

export type ChargeTotalsModel = {
    price: PriceModel;
    discounts: Record<string, PriceModel>;
    totalDiscount: PriceModel;
    netPrice: PriceModel;
    taxBreakdown: Record<string, ChargeTaxBreakdownModel>;
    taxTotal: PriceModel;
    grandTotal: PriceModel;
};

export type ChargeAttributes = CustomFieldAttributes & {
    id: string;
    name: LocalizedString;
    category: string;
    lineItemId?: string;
    chargeType: ChargeType;
    chargeImpact: ChargeImpact;
    taxTreatment: ChargeTaxTreatment;
    pricing: ChargePricing;
    total: ChargeTotals;
};

export type ChargeData = Omit<Required<ChargeAttributes>, 'lineItemId'> & {
    lineItemId?: string;
};

/**
 * Represents an additional charge (or discount if amount is negative) in a shopping container.
 * Supports its own tax rules.
 */
export default class ChargeModel extends CustomFieldModel {
    protected id: string;
    protected name: LocalizedString;
    protected category: string;
    protected lineItemId?: string;
    protected chargeType: ChargeType;
    protected chargeImpact: ChargeImpact;
    protected taxTreatment: ChargeTaxTreatment;
    protected pricing: {
        price: PriceModel;
        taxCategory: string;
        applicableTaxRule: FixedTaxRuleModel[];
    };
    protected total: ChargeTotalsModel;

    constructor(data: ChargeAttributes) {
        super(data);
        this.id = data.id;
        this.name = data.name;
        this.category = data.category;
        this.lineItemId = data.lineItemId;
        this.chargeType = data.chargeType;
        this.chargeImpact = data.chargeImpact;
        this.taxTreatment = data.taxTreatment;
        this.pricing = {
            price: new PriceModel(data.pricing.price),
            taxCategory: data.pricing.taxCategory,
            applicableTaxRule: data.pricing.applicableTaxRule.map(r => new FixedTaxRuleModel(r))
        };

        if (this.chargeType !== ChargeType.ADJUSTMENT) {
            if (this.chargeImpact !== ChargeImpact.ADD) {
                throw new InvalidChargeError("Only adjustment charges can be subtractive.");
            }
            if (this.taxTreatment !== ChargeTaxTreatment.APPLY) {
                throw new InvalidChargeError("Non-adjustment charges must apply tax.");
            }
        } else {
            if (this.taxTreatment !== ChargeTaxTreatment.EXEMPT) {
                throw new InvalidChargeError("Adjustment charges must be tax exempt.");
            }
            if (this.pricing.applicableTaxRule.length > 0) {
                throw new InvalidChargeError("Adjustment charges cannot have tax rules.");
            }
        }

        this.total = {
            price: new PriceModel(data.total.price),
            discounts: Object.fromEntries(
                Object.entries(data.total.discounts).map(([discountId, discount]) => [
                    discountId,
                    new PriceModel(discount)
                ])
            ),
            totalDiscount: new PriceModel(data.total.totalDiscount),
            netPrice: new PriceModel(data.total.netPrice),
            taxBreakdown: Object.fromEntries(
                Object.entries(data.total.taxBreakdown).map(([taxRuleId, taxBreakdown]) => [
                    taxRuleId,
                    {
                        rate: taxBreakdown.rate,
                        taxablePrice: new PriceModel(taxBreakdown.taxablePrice),
                        amount: new PriceModel(taxBreakdown.amount),
                        system: taxBreakdown.system,
                        subSystem: taxBreakdown.subSystem
                    }
                ])
            ),
            taxTotal: new PriceModel(data.total.taxTotal),
            grandTotal: new PriceModel(data.total.grandTotal),
        };
    }

    /**
     * Gets the unique identifier of the charge.
     * @returns 
     */
    public getId(): string { return this.id; }


    /**
     * Gets the full localized product name object.
     * @returns A copy of the LocalizedString object for the name.
     */
    getName(): LocalizedString
    /**
     * Gets the product name for a specific locale, falling back to English ('en').
     * @param locale - The desired locale code.
     * @returns The name string for the specified locale.
     */
    getName(locale: LocaleCode): string
    getName(locale?: LocaleCode): LocalizedString | string {
        if (locale) {
        return Utils.deepClone(this.name[locale] ?? this.name[LocaleLanguageMap[locale]] ?? this.name.en);
        } else {
        return Utils.deepClone(this.name);
        }
    }

    /**
     * Gets the charge category.
     * @returns The category string.
     */
    public getCategory(): string { return this.category; }

    /**
     * Gets the charge type.
     * @returns The charge type enum value.
     */
    public getChargeType(): ChargeType { return this.chargeType; }
    /**
     * Gets the charge impact (add or subtract).
     * @returns The charge impact.
     */
    public getChargeImpact(): ChargeImpact { return this.chargeImpact; }
    /**
     * Gets how tax is treated for this charge.
     * @returns The tax treatment for this charge.
     */
    public getTaxTreatment(): ChargeTaxTreatment { return this.taxTreatment; }

    /**
     * Gets the related line item id, if any.
     * @returns The line item id or undefined.
     */
    public getLineItemId(): string | undefined { return this.lineItemId; }

    /**
     * Gets the pricing details (models) for this charge.
     * @returns Pricing details including price, tax category, and tax rules.
     */
    public getPricing() {
        return {
            price: this.pricing.price,
            taxCategory: this.pricing.taxCategory,
            applicableTaxRule: [...this.pricing.applicableTaxRule]
        };
    }
    
    /**
     * Gets the computed totals for this charge.
     * @returns Totals including discounts, taxes, and grand total.
     */
    public getTotal(): ChargeTotalsModel {
        return {
            price: this.total.price,
            discounts: { ...this.total.discounts },
            netPrice: this.total.netPrice,
            totalDiscount: this.total.totalDiscount,
            taxBreakdown: Object.fromEntries(
                Object.entries(this.total.taxBreakdown).map(([key, value]) => [
                    key,
                    {
                        rate: value.rate,
                        taxablePrice: value.taxablePrice,
                        amount: value.amount,
                        system: value.system,
                        subSystem: value.subSystem
                    }
                ])
            ),
            taxTotal: this.total.taxTotal,
            grandTotal: this.total.grandTotal,
        };
    }

    /**
     * Gets the applicable tax rules for this charge.
     * @returns A list of tax rules.
     */
    public getApplicableTaxRules(): FixedTaxRuleModel[] {
        return [...this.pricing.applicableTaxRule];
    }

    /**
     * Updates the tax rule for this line item and recalculates totals.
     * @param taxRule - The new tax rule to apply.
     * @throws {Error} If the tax rule category does not match the item's tax category.
     */
    public updateTax(taxRules: FixedTaxRuleModel[]): void {
        if (this.chargeType === ChargeType.ADJUSTMENT && taxRules.length > 0) {
            throw new InvalidChargeError("Adjustment charges cannot apply tax rules.");
        }
        taxRules.forEach(taxRule => {
            if (!taxRule.appliesTo(this.pricing.taxCategory, taxRule.getTaxCountry())) {
                throw new InvalidTaxRuleError();
            }
        });

        // Remove the old taxableUnitPrice calculation - no longer needed
        this.pricing.applicableTaxRule = taxRules;
        this.calculateTotals();
    }

    /**
       * Updates the discounts applied to this line item and recalculates totals.
       * @param appliedDiscounts - List of coupons and their allocated discount amounts.
       */
    public updateDiscounts(appliedDiscounts: { coupon: CouponModel, amount: PriceModel }[]): void {
        let chargeDiscounts = {} as Record<string, PriceModel>;
        appliedDiscounts.forEach(discount => {
            chargeDiscounts[discount.coupon.getCode()] = discount.amount;
        });

        this.total.discounts = chargeDiscounts;
        this.calculateTotals();
    }

    /**
     * Recalculates totals for this charge based on pricing and discounts.
     */
    public calculateTotals(): void {
        const zero = this.pricing.price.zero();
        const price = this.pricing.price;

        const totalDiscount = Object.values(this.total.discounts).reduce((sum, s) => sum.add(s), zero);
        const grossAmount = price.subtract(totalDiscount);

        if(this.taxTreatment === ChargeTaxTreatment.EXEMPT){
            this.total = {
                price: price,
                discounts: this.total.discounts,
                totalDiscount: totalDiscount,
                netPrice: grossAmount,
                taxBreakdown: {},
                taxTotal: zero,
                grandTotal: grossAmount
            };
            return;
        }

        const taxBreakdown: Record<string, ChargeTaxBreakdownModel> = {};

          // 1. Calculate total rate for inclusive back-calculation
          const totalRate = this.pricing.applicableTaxRule.reduce((sum, r) => sum + r.getApplicableTaxRate(), 0);
  
          if (totalRate <= 0) {
              this.total = {
                  price: price,
                  discounts: this.total.discounts,
                  netPrice: grossAmount,
                  totalDiscount: totalDiscount,
                  taxBreakdown: {},
                  taxTotal: zero,
                  grandTotal: grossAmount
              };
              return;
          }
  
          // 2. Iteratively find a taxable base so that base + sum(rounded taxes) == gross
          const currency = grossAmount.getCurrency();
          const grossValue = grossAmount.getAmount();
          const step = 0.01;
          const maxIterations = 100;
  
          let baseValue = PriceModel.getRoundedAmount(grossValue / (1 + totalRate), currency);
          let bestBaseValue = baseValue;
          let bestDiff = Number.POSITIVE_INFINITY;
  
          for (let i = 0; i < maxIterations; i++) {
              const taxes = this.pricing.applicableTaxRule.map(rule =>
                  PriceModel.getRoundedAmount(baseValue * rule.getApplicableTaxRate(), currency)
              );
              const taxSum = taxes.reduce((sum, v) => sum + v, 0);
              const diff = (baseValue + taxSum) - grossValue;
  
              if (Math.abs(diff) < Math.abs(bestDiff)) {
                  bestDiff = diff;
                  bestBaseValue = baseValue;
              }
  
              if (diff === 0) break;
              baseValue = diff > 0 ? baseValue - step : baseValue + step;
              if (baseValue < 0 || baseValue > grossValue) break;
          }
  
          const taxableBase = new PriceModel({ amount: bestBaseValue, currency });
  
          // 3. Compute tax amounts per rule based on final taxable base
          let distributedTax = zero;
          this.pricing.applicableTaxRule.forEach((taxRule) => {
              const rate = taxRule.getApplicableTaxRate();
              const taxAmountValue = PriceModel.getRoundedAmount(bestBaseValue * rate, currency);
              const taxAmount = new PriceModel({ amount: taxAmountValue, currency });
  
              taxBreakdown[taxRule.getTaxRuleId()] = {
                  rate: rate,
                  taxablePrice: taxableBase,
                  amount: taxAmount,
                  system: taxRule.getTaxSystem(),
                  subSystem: taxRule.getTaxSubSystem()
              };
              distributedTax = distributedTax.add(taxAmount);
          });
  
          // Assign residual if any to netPrice
          const netPrice = grossAmount.subtract(distributedTax);
          const grandTotal = grossAmount;

        this.total = {
            price: price,
            discounts: this.total.discounts,
            netPrice: netPrice,
            totalDiscount: totalDiscount,
            taxBreakdown: taxBreakdown,
            taxTotal: distributedTax,
            grandTotal: grandTotal
        };
    }

    /**
     * Gets a plain data object representing this charge.
     * @returns ChargeData for serialization.
     */
    public getDetails(): ChargeData {
        const details: ChargeData = {
            id: this.id,
            name: Utils.deepClone(this.name),
            category: this.category,
            lineItemId: this.lineItemId,
            chargeType: this.chargeType,
            chargeImpact: this.chargeImpact,
            taxTreatment: this.taxTreatment,
            pricing: {
                price: this.pricing.price.getDetails(),
                taxCategory: this.pricing.taxCategory,
                applicableTaxRule: this.pricing.applicableTaxRule.map(r => r.getDetails())
            },
            total: {
                price: this.total.price.getDetails(),
                discounts: Object.fromEntries(Object.entries(this.total.discounts).map(([k, v]) => [k, v.getDetails()])),
                totalDiscount: this.total.totalDiscount.getDetails(),
                netPrice: this.total.netPrice.getDetails(),
                taxBreakdown: Object.fromEntries(Object.entries(this.total.taxBreakdown).map(([k, v]) => [k, {
                    rate: v.rate,
                    taxablePrice: v.taxablePrice.getDetails(),
                    amount: v.amount.getDetails(),
                    system: v.system,
                    subSystem: v.subSystem
                }])),
                taxTotal: this.total.taxTotal.getDetails(),
                grandTotal: this.total.grandTotal.getDetails()
            },
            customFields: this.getAllCustomFields()
        };
        return details;
    }
}

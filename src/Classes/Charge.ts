import { CustomFieldAttributes, CustomFieldModel } from "./Base";
import Utils from "../Utils";
import { LocaleCode, LocalizedString } from "./Common";
import { ChargeImpact, ChargeType, LocaleLanguageMap, TaxSystem } from "./Enum";
import { InvalidChargeTaxRuleError, InvalidChargeError, InvalidTaxRuleError } from "./Error";
import PriceModel, { PriceData } from "./Price";
import { TaxRuleData, TaxRuleModel } from "./TaxRule";
import CouponModel from "./Coupon";

export type ChargePricing = {
  /** Tax-inclusive original charge amount before any discounts. Always non-negative. */
  baseChargeAmount: PriceData;
  /** Tax category of the charge. */
  taxCategory: string;
  /** Tax rules applicable to the charge. */
  applicableTaxRule: TaxRuleData[];
};

export type ChargePricingModel = {
  /** Tax-inclusive original charge amount before any discounts. Always non-negative. */
  baseChargeAmount: PriceModel;
  /** Tax category of the charge. */
  taxCategory: string;
  /** Tax rules applicable to the charge. */
  applicableTaxRule: TaxRuleModel[];
};

export type ChargeTaxBreakdown = {
  /** Tax rate: e.g., 0.09 for 9% */
  rate: number;
  /** Reverse-calculated pre-tax base from the netChargeAmount (post-discount) */
  taxableAmount: PriceData;
  /** Tax portion for this rule (netChargeAmount - taxableAmount) */
  taxAmount: PriceData;
  system: TaxSystem;
  subSystem: string;
};

export type ChargeTaxBreakdownModel = {
  rate: number;
  taxableAmount: PriceModel;
  taxAmount: PriceModel;
  system: TaxSystem;
  subSystem: string;
};

export type ChargeTotals = {
  /** Tax-inclusive original charge amount before discounts (copied from pricing) */
  chargeAmount: PriceData;
  /** Coupon code -> discount amount mapping */
  discountBreakdown: Record<string, PriceData>;
  /** Sum of all discounts */
  discountTotal: PriceData;
  /** chargeAmount - totalDiscount → final tax-inclusive payable amount after discounts */
  netChargeAmount: PriceData;
  /** Sum of all taxAmount values */
  taxTotal: PriceData;
  /** Tax breakdown per rule/category (reverse-calculated from netChargeAmount) */
  taxBreakdown: Record<string, ChargeTaxBreakdown>;
  /** Final payable/contribution amount. Equals netChargeAmount (tax-inclusive after discounts). */
  grandTotal: PriceData;
};

export type ChargeTotalsModel = {
  chargeAmount: PriceModel;
  discountTotal: PriceModel;
  discountBreakdown: Record<string, PriceModel>;
  netChargeAmount: PriceModel;
  taxTotal: PriceModel;
  taxBreakdown: Record<string, ChargeTaxBreakdownModel>;
  grandTotal: PriceModel; // Equals netChargeAmount
};

export type ChargeAttributes = CustomFieldAttributes & {
  id: string;
  name: LocalizedString;
  type: ChargeType;
  category: string;
  impact: ChargeImpact; // ADD or SUBTRACT
  pricing: ChargePricing;
  lineItemId?: string;
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
	protected type: ChargeType;
	protected category: string;
	protected impact: ChargeImpact;
	protected pricing: ChargePricingModel;
	protected lineItemId?: string;
	protected total: ChargeTotalsModel;

	constructor(data: ChargeAttributes) {
		super(data);
		this.id = data.id;
		this.name = data.name;
		this.type = data.type;
		this.category = data.category;
		this.impact = data.impact;
		this.lineItemId = data.lineItemId;
		this.pricing = {
			baseChargeAmount: new PriceModel(data.pricing.baseChargeAmount),
			taxCategory: data.pricing.taxCategory,
			applicableTaxRule: data.pricing.applicableTaxRule.map(r => new TaxRuleModel(r))
		};

		this.validateTaxRules(this.pricing.applicableTaxRule);
		if(this.impact === ChargeImpact.SUBTRACT && this.type !== ChargeType.ADJUSTMENT) {
			throw new InvalidChargeError('SUBTRACT impact is only allowed for ADJUSTMENT charge');
		}

		this.total = {
			chargeAmount: new PriceModel(data.total.chargeAmount),
			discountTotal: new PriceModel(data.total.discountTotal),
			discountBreakdown: Object.fromEntries(
				Object.entries(data.total.discountBreakdown).map(([discountId, discount]) => [
					discountId,
					new PriceModel(discount)
				])
			),
			netChargeAmount: new PriceModel(data.total.netChargeAmount),
			taxBreakdown: Object.fromEntries(
				Object.entries(data.total.taxBreakdown).map(([taxRuleId, taxBreakdown]) => [
					taxRuleId,
					{
						rate: taxBreakdown.rate,
						taxableAmount: new PriceModel(taxBreakdown.taxableAmount),
						taxAmount: new PriceModel(taxBreakdown.taxAmount),
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
	public getType(): ChargeType { return this.type; }
	/**
	 * Gets the charge impact (add or subtract).
	 * @returns The charge impact.
	 */
	public getImpact(): ChargeImpact { return this.impact; }

	/**
	 * Gets the related line item id, if any.
	 * @returns The line item id or undefined.
	 */
	public getLineItemId(): string | undefined { return this.lineItemId; }

	/**
	 * Gets the pricing details (models) for this charge.
	 * @returns Pricing details including price, tax category, and tax rules.
	 */
	public getPricing(): ChargePricingModel {
		return {
			baseChargeAmount: this.pricing.baseChargeAmount,
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
			chargeAmount: this.total.chargeAmount,
			discountTotal: this.total.discountTotal,
			discountBreakdown: { ...this.total.discountBreakdown },
			netChargeAmount: this.total.netChargeAmount,
			taxTotal: this.total.taxTotal,
			taxBreakdown: Object.fromEntries(
				Object.entries(this.total.taxBreakdown).map(([key, value]) => [
					key,
					{
						rate: value.rate,
						taxableAmount: value.taxableAmount,
						taxAmount: value.taxAmount,
						system: value.system,
						subSystem: value.subSystem
					}
				])
			),
			grandTotal: this.total.grandTotal,
		};
	}

	/**
	 * Gets the applicable tax rules for this charge.
	 * @returns A list of tax rules.
	 */
	public getApplicableTaxRules(): TaxRuleModel[] {
		return [...this.pricing.applicableTaxRule];
	}

	/**
	 * Updates the tax rule for this line item and recalculates totals.
	 * @param taxRule - The new tax rule to apply.
	 * @throws {Error} If the tax rule category does not match the item's tax category.
	 */
	public updateTax(taxRules: TaxRuleModel[]): void {
		if (this.type === ChargeType.ADJUSTMENT && taxRules.length > 0) {
			throw new InvalidChargeError("Adjustment charges cannot apply tax rules.");
		}
		taxRules.forEach(taxRule => {
			if (!taxRule.appliesTo(this.pricing.taxCategory, taxRule.getCountry())) {
				throw new InvalidTaxRuleError();
			}
		});

		// Remove the old taxableUnitPrice calculation - no longer needed
		this.validateTaxRules(taxRules);
		this.pricing.applicableTaxRule = taxRules;
		this.calculateTotals();
	}

	/**
	 * Validates that there are no overlapping price brackets for any tax rules within the charge.
	 * @param taxRules - The list of tax rules to validate.
	 * @throws {InvalidChargeTaxRuleError} If any rules have positive tax rates with SUBTRACT impact or if duplicate rule IDs are found.
	 * @throws {InvalidChargeTaxRuleError} Duplicate tax rule IDs will results in error.
	 * @throws {CoincidingTaxBracketError} If any overlapping rules are found.
	 */
	private validateTaxRules(taxRules: TaxRuleModel[]): void {
		if(this.impact === ChargeImpact.SUBTRACT) {
			if(taxRules.some(taxRule => taxRule.getRate() > 0)) {
				throw new InvalidChargeTaxRuleError("Subtractive charges cannot have positive tax rates.");
			}
		}

		const uniqueTaxRule = new Set();
		for (let i = 0; i < taxRules.length; i++) {
			const currentTaxRuleId = taxRules[i].getTaxRuleId();
			if(uniqueTaxRule.has(currentTaxRuleId)){
				throw new InvalidChargeTaxRuleError("Duplicate tax rule ID found: " + currentTaxRuleId);
			} else {
				uniqueTaxRule.add(currentTaxRuleId);
			}

			for (let j = i + 1; j < taxRules.length; j++) {
				const r1 = taxRules[i];
				const r2 = taxRules[j];

				const r1Min = r1.getMinPrice();
				const r1Max = r1.getMaxPrice();
				const r1ExcludeMin = r1.getExcludeMin();
				const r1ExcludeMax = r1.getExcludeMax();
				const r2Min = r2.getMinPrice();
				const r2Max = r2.getMaxPrice();
				const r2ExcludeMin = r2.getExcludeMin();
				const r2ExcludeMax = r2.getExcludeMax();

				// Two ranges are disjoint if one ends strictly before the other starts.
				// If they only touch at one point, disjoint only when either side excludes that point.
				const r1EndsBeforeR2Starts = (() => {
					if (!r1Max) return false;
					const compare = r1Max.compareTo(r2Min);
					return compare < 0 || (compare === 0 && (r1ExcludeMax || r2ExcludeMin));
				})();
				const r2EndsBeforeR1Starts = (() => {
					if (!r2Max) return false;
					const compare = r2Max.compareTo(r1Min);
					return compare < 0 || (compare === 0 && (r2ExcludeMax || r1ExcludeMin));
				})();
				const overlap = !(r1EndsBeforeR2Starts || r2EndsBeforeR1Starts);

				if (overlap) {
					// Exception: Allow overlapping rules if they have the exact same price bracket (slab)
					const sameSlab = r1Min.compareTo(r2Min) === 0 &&
						r1ExcludeMin === r2ExcludeMin &&
						r1ExcludeMax === r2ExcludeMax &&
						((!r1Max && !r2Max) || (r1Max && r2Max && r1Max.compareTo(r2Max) === 0));

					if (!sameSlab) {
						throw new InvalidChargeTaxRuleError(
							`Overlapping rules found: [${r1.getTaxRuleId()}: ${r1ExcludeMin ? "(" : "["}${r1Min.getAmount()}-${r1Max?.getAmount() ?? "Infinity"}${r1ExcludeMax ? ")" : "]"}] and [${r2.getTaxRuleId()}: ${r2ExcludeMin ? "(" : "["}${r2Min.getAmount()}-${r2Max?.getAmount() ?? "Infinity"}${r2ExcludeMax ? ")" : "]"}]`
						);
					}
				}
			}
		}
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

		this.total.discountBreakdown = chargeDiscounts;
		this.calculateTotals();
	}

	/**
	 * Recalculates totals for this charge based on pricing and discounts.
	 */
	public calculateTotals(): void {
		const zero = this.pricing.baseChargeAmount.zero();
		const baseChargeAmount = this.pricing.baseChargeAmount;

		const totalDiscount = Object.values(this.total.discountBreakdown).reduce((sum, s) => sum.add(s), zero);
		const netChargeAmount = baseChargeAmount.subtract(totalDiscount);

		const taxBreakdown: Record<string, ChargeTaxBreakdownModel> = {};

		// 1. Calculate total rate for inclusive back-calculation
		const totalRate = this.pricing.applicableTaxRule.reduce((sum, r) => sum + r.getApplicableTaxRate(netChargeAmount), 0);

		if (totalRate <= 0) {
			this.total = {
				chargeAmount: baseChargeAmount,
				discountTotal: totalDiscount,
				discountBreakdown: this.total.discountBreakdown,
				netChargeAmount: netChargeAmount,
				taxTotal: zero,
				taxBreakdown: {},
				grandTotal: netChargeAmount
			};
			return;
		}

		// 2. Iteratively find a taxable base so that base + sum(rounded taxes) == gross
		const currency = baseChargeAmount.getCurrency();
		const grossValue = baseChargeAmount.getAmount();
		const maxIterations = 1000;

		let baseValue = PriceModel.getRoundedAmount(grossValue / (1 + totalRate), currency);
		let bestBaseValue = baseValue;
		let bestDiff = Number.POSITIVE_INFINITY;

		for (let i = 0; i < maxIterations; i++) {
			const currentTaxableBase = new PriceModel({ amount: baseValue, currency });
			const taxes = this.pricing.applicableTaxRule
				.sort((a, b) => b.getApplicableTaxRate(currentTaxableBase) - a.getApplicableTaxRate(currentTaxableBase))
				.map(rule =>
					PriceModel.getRoundedAmount(baseValue * rule.getApplicableTaxRate(currentTaxableBase), currency)
				);

			const taxSum = taxes.reduce((sum, v) => sum + v, 0);
			const diff = (baseValue + taxSum) - grossValue;

			const currentTotalRate = this.pricing.applicableTaxRule.reduce((sum, r) => sum + r.getApplicableTaxRate(currentTaxableBase), 0);

			if (Math.abs(diff) < Math.abs(bestDiff)) {
				bestDiff = diff;
				bestBaseValue = baseValue;
			}

			if (diff === 0) break;
			baseValue = baseValue - diff / (1 + currentTotalRate); // Adjust base value based on the difference
			if (baseValue < 0 || baseValue > grossValue) break;
		}

		const taxableBase = new PriceModel({ amount: bestBaseValue, currency });

		// 3. Compute tax amounts per rule based on final taxable base
		let distributedTax = zero;
		this.pricing.applicableTaxRule
			.sort((a, b) => b.getApplicableTaxRate(taxableBase) - a.getApplicableTaxRate(taxableBase))
			.forEach((taxRule) => {
				const rate = taxRule.getApplicableTaxRate(taxableBase);
				const taxAmountValue = PriceModel.getRoundedAmount(bestBaseValue * rate, currency);
				const taxAmount = new PriceModel({ amount: taxAmountValue, currency });

				taxBreakdown[taxRule.getTaxRuleId()] = {
					rate: rate,
					taxableAmount: taxableBase,
					taxAmount: taxAmount,
					system: taxRule.getTaxSystem(),
					subSystem: taxRule.getTaxSubSystem()
				};
				distributedTax = distributedTax.add(taxAmount);
			});

		const grandTotal = netChargeAmount;
		this.total = {
			chargeAmount: baseChargeAmount,
			discountTotal: totalDiscount,
			discountBreakdown: this.total.discountBreakdown,
			netChargeAmount: netChargeAmount,
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
			type: this.type,
			category: this.category,
			pricing: {
				baseChargeAmount: this.pricing.baseChargeAmount.getDetails(),
				taxCategory: this.pricing.taxCategory,
				applicableTaxRule: this.pricing.applicableTaxRule.map(r => r.getDetails())
			},
			impact: this.impact,
			lineItemId: this.lineItemId,
			total: {
				chargeAmount: this.total.chargeAmount.getDetails(),
				discountTotal: this.total.discountTotal.getDetails(),
				discountBreakdown: Object.fromEntries(Object.entries(this.total.discountBreakdown).map(([k, v]) => [k, v.getDetails()])),
				netChargeAmount: this.total.netChargeAmount.getDetails(),
				taxBreakdown: Object.fromEntries(Object.entries(this.total.taxBreakdown).map(([k, v]) => [k, {
					rate: v.rate,
					taxableAmount: v.taxableAmount.getDetails(),
					taxAmount: v.taxAmount.getDetails(),
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

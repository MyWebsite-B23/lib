import PriceModel from "../Classes/Price";
import { TaxSystem } from "../Classes/Enum";
import { TaxRuleModel } from "../Classes/TaxRule";

export const extractExclusiveBase = (
    grossValue: PriceModel,
    applicableTaxRules: TaxRuleModel[]
): PriceModel => {
    const totalRate = applicableTaxRules.reduce((sum, r) => sum + r.getApplicableTaxRate(grossValue), 0);
    
    if (totalRate <= 0) {
        return grossValue;
    }
    
    let baseValue = grossValue.divide(1 + totalRate).round().getAmount();
    const currency = grossValue.getCurrency();
    const grossAmount = grossValue.getAmount();

    let bestBaseValue = baseValue;
    let bestDiff = Number.POSITIVE_INFINITY;
    const maxIterations = 10000;

    for (let i = 0; i < maxIterations; i++) {
        const currentTaxableBase = new PriceModel({ amount: baseValue, currency });
        const taxes = applicableTaxRules
            .sort((a, b) => b.getApplicableTaxRate(currentTaxableBase) - a.getApplicableTaxRate(currentTaxableBase))
            .map(rule => currentTaxableBase.multiply(rule.getApplicableTaxRate(currentTaxableBase)).round().getAmount());

        const taxSum = taxes.reduce((sum, v) => sum + v, 0);
        const diff = (baseValue + taxSum) - grossAmount;

        const currentTotalRate = applicableTaxRules.reduce((sum, r) => sum + r.getApplicableTaxRate(currentTaxableBase), 0);

        if (Math.abs(diff) < Math.abs(bestDiff)) {
            bestDiff = diff;
            bestBaseValue = baseValue;
        }

        if (diff === 0) break;
        baseValue = baseValue - diff / (1 + currentTotalRate);
    }

    if (Math.abs(bestDiff) > PriceModel.getSmallestUnit(currency)) {
        throw new Error("Failed to converge on a valid tax exclusive base.");
    }

    return new PriceModel({ amount: bestBaseValue, currency });
}

export const calculateDistributedTaxes = (
    baseModel: PriceModel,
    grossModel: PriceModel,
    applicableTaxRules: TaxRuleModel[]
): { ruleId: string, taxAmount: PriceModel, rate: number }[] => {
    let distributedTax = baseModel.zero();
    
    const sortedRules = [...applicableTaxRules].sort(
        (a, b) => b.getApplicableTaxRate(baseModel) - a.getApplicableTaxRate(baseModel)
    );

    return sortedRules.map((rule, index) => {
        const ruleRate = rule.getApplicableTaxRate(baseModel);
        let taxAmount: PriceModel;
        
        if (index === sortedRules.length - 1) {
            taxAmount = grossModel.subtract(baseModel).subtract(distributedTax);
        } else {
            taxAmount = baseModel.multiply(ruleRate).round();
        }
        
        distributedTax = distributedTax.add(taxAmount);
        
        return {
            ruleId: rule.getTaxRuleId(),
            taxAmount,
            rate: ruleRate
        };
    });
};

// ─── Shared Tax Calculation Functions ─────────────────────────────

/**
 * Represents a single tax rule's contribution to the total tax.
 */
export type TaxBreakdownEntry = {
    ruleId: string;
    rate: number;
    taxableAmount: PriceModel;
    taxAmount: PriceModel;
    system: TaxSystem;
    subSystem: string;
};

/**
 * Result of a tax breakdown calculation containing per-rule entries,
 * the aggregate tax total, and the exclusive taxable base.
 */
export type TaxBreakdownResult = {
    entries: TaxBreakdownEntry[];
    taxTotal: PriceModel;
    taxableBase: PriceModel;
};

/**
 * Calculates a tax breakdown from a net amount and tax rules.
 * Handles both tax-inclusive (reverse calculation) and tax-exclusive (forward calculation) paths.
 *
 * @param netAmount - The net amount (after discounts) in its native basis (inclusive or exclusive).
 * @param isTaxInclusive - Whether netAmount already contains tax.
 * @param taxRules - The applicable tax rules.
 * @returns Per-rule tax entries, total tax, and the exclusive taxable base.
 */
export const calculateTaxBreakdown = (
    netAmount: PriceModel,
    isTaxInclusive: boolean,
    taxRules: TaxRuleModel[]
): TaxBreakdownResult => {
    const zero = netAmount.zero();
    let taxTotal = zero;
    const entries: TaxBreakdownEntry[] = [];

    if (isTaxInclusive) {
        const totalRate = taxRules.reduce((sum, r) => sum + r.getApplicableTaxRate(netAmount), 0);
        if (totalRate <= 0) {
            return { entries: [], taxTotal: zero, taxableBase: netAmount };
        }

        const taxableBase = extractExclusiveBase(netAmount, taxRules);
        const distributedTaxes = calculateDistributedTaxes(taxableBase, netAmount, taxRules);

        distributedTaxes.forEach(dt => {
            const taxRule = taxRules.find(r => r.getTaxRuleId() === dt.ruleId)!;
            entries.push({
                ruleId: dt.ruleId,
                rate: dt.rate,
                taxableAmount: taxableBase,
                taxAmount: dt.taxAmount,
                system: taxRule.getTaxSystem(),
                subSystem: taxRule.getTaxSubSystem()
            });
            taxTotal = taxTotal.add(dt.taxAmount);
        });

        return { entries, taxTotal, taxableBase };
    } else {
        taxRules.forEach(taxRule => {
            const rate = taxRule.getApplicableTaxRate(netAmount);
            if (rate <= 0) return; // Skip non-applicable rules
            const taxAmount = taxRule.calculateTax(netAmount);
            entries.push({
                ruleId: taxRule.getTaxRuleId(),
                rate,
                taxableAmount: netAmount,
                taxAmount,
                system: taxRule.getTaxSystem(),
                subSystem: taxRule.getTaxSubSystem()
            });
            taxTotal = taxTotal.add(taxAmount);
        });

        return { entries, taxTotal, taxableBase: netAmount };
    }
};

/**
 * Result containing both tax-exclusive and tax-inclusive views of totals.
 */
export type DualViewTotals = {
    taxExclusive: { baseAmount: PriceModel; netAmount: PriceModel; grandTotal: PriceModel };
    taxInclusive: { baseAmount: PriceModel; netAmount: PriceModel; grandTotal: PriceModel };
    taxTotal: PriceModel;
    taxBreakdown: TaxBreakdownEntry[];
    discountTotal: PriceModel;
};

/**
 * Computes both tax-exclusive and tax-inclusive views of totals for a given gross amount,
 * discount, and tax rules. Suitable for flat-amount entities like charges.
 *
 * @param grossAmount - The original amount (before discounts), in its native basis.
 * @param discount - The total discount to apply (in the same basis as grossAmount).
 * @param isTaxInclusive - Whether grossAmount already contains tax.
 * @param taxRules - The applicable tax rules.
 * @returns Both exclusive and inclusive views, tax breakdown, and totals.
 */
export const calculateDualViewTotals = (
    grossAmount: PriceModel,
    discount: PriceModel,
    isTaxInclusive: boolean,
    taxRules: TaxRuleModel[]
): DualViewTotals => {
    const netAmount = grossAmount.subtract(discount);
    const { entries, taxTotal, taxableBase } = calculateTaxBreakdown(netAmount, isTaxInclusive, taxRules);

    if (isTaxInclusive) {
        const grossExclBase = extractExclusiveBase(grossAmount, taxRules);

        return {
            taxExclusive: {
                baseAmount: grossExclBase,
                netAmount: taxableBase,
                grandTotal: taxableBase,
            },
            taxInclusive: {
                baseAmount: grossAmount,
                netAmount: netAmount,
                grandTotal: netAmount,
            },
            taxTotal,
            taxBreakdown: entries,
            discountTotal: discount,
        };
    } else {
        let originalTax = grossAmount.zero();
        taxRules.forEach(taxRule => {
            originalTax = originalTax.add(taxRule.calculateTax(grossAmount));
        });
        const grossAmountInclTax = grossAmount.add(originalTax);
        const netAmountInclTax = netAmount.add(taxTotal);

        return {
            taxExclusive: {
                baseAmount: grossAmount,
                netAmount: netAmount,
                grandTotal: netAmount,
            },
            taxInclusive: {
                baseAmount: grossAmountInclTax,
                netAmount: netAmountInclTax,
                grandTotal: netAmountInclTax,
            },
            taxTotal,
            taxBreakdown: entries,
            discountTotal: discount,
        };
    }
};

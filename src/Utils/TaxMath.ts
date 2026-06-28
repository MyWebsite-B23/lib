import PriceModel from "../Classes/Price";
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

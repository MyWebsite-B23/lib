import assert from "node:assert/strict";
import ChargeModel, { ChargeAttributes } from "../Classes/Charge";
import { ChargeImpact, ChargeType, TaxSystem } from "../Classes/Enum";
import { InvalidChargeTaxRuleError } from "../Classes/Error";
import { TaxRuleModel } from "../Classes/TaxRule";

describe("Charge Tax Bracket Overlap Validation", () => {
  const currency = "INR" as const;
  const pricing = {
    baseChargeAmount: { amount: 1000, currency },
    taxCategory: "standard",
    applicableTaxRule: [] as any[],
  };

  const buildChargeData = (rules: ReturnType<TaxRuleModel["getDetails"]>[]): ChargeAttributes => ({
    id: "c1",
    name: { en: "Shipping" },
    category: "shipping",
    type: ChargeType.SHIPPING,
    impact: ChargeImpact.ADD,
    pricing: {
      ...pricing,
      applicableTaxRule: rules,
    },
    total: {
      chargeAmount: pricing.baseChargeAmount,
      discountBreakdown: {},
      discountTotal: { amount: 0, currency },
      netChargeAmount: pricing.baseChargeAmount,
      taxTotal: { amount: 0, currency },
      taxBreakdown: {},
      grandTotal: pricing.baseChargeAmount,
    },
    customFields: {},
  });

  const rule1 = new TaxRuleModel({
    taxRuleId: "r1",
    taxCategory: "standard",
    taxSystem: TaxSystem.GST,
    taxSubSystem: "IGST",
    country: "IN",
    rate: 0.18,
    minPrice: { amount: 0, currency },
    maxPrice: { amount: 100, currency },
    effectiveFrom: new Date().toISOString(),
  });

  const rule2Overlapping = new TaxRuleModel({
    taxRuleId: "r2",
    taxCategory: "standard",
    taxSystem: TaxSystem.GST,
    taxSubSystem: "IGST",
    country: "IN",
    rate: 0.12,
    minPrice: { amount: 50, currency },
    maxPrice: { amount: 150, currency },
    effectiveFrom: new Date().toISOString(),
  });

  const rule3Adjacent = new TaxRuleModel({
    taxRuleId: "r3",
    taxCategory: "standard",
    taxSystem: TaxSystem.GST,
    taxSubSystem: "IGST",
    country: "IN",
    rate: 0.12,
    minPrice: { amount: 101, currency },
    maxPrice: { amount: 200, currency },
    effectiveFrom: new Date().toISOString(),
  });

  it("throws InvalidChargeTaxRuleError in constructor for overlapping rules", () => {
    assert.throws(
      () => new ChargeModel(buildChargeData([rule1.getDetails(), rule2Overlapping.getDetails()])),
      InvalidChargeTaxRuleError
    );
  });

  it("does NOT throw in constructor for adjacent rules", () => {
    assert.doesNotThrow(() => new ChargeModel(buildChargeData([rule1.getDetails(), rule3Adjacent.getDetails()])));
  });

  it("throws InvalidChargeTaxRuleError for overlap across different subsystems", () => {
    const overlappingRule = new TaxRuleModel({
      taxRuleId: "r4-overlap",
      taxCategory: "standard",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "CGST",
      country: "IN",
      rate: 0.09,
      minPrice: { amount: 50, currency },
      maxPrice: { amount: 150, currency },
      effectiveFrom: new Date().toISOString(),
    });

    assert.throws(
      () => new ChargeModel(buildChargeData([rule1.getDetails(), overlappingRule.getDetails()])),
      InvalidChargeTaxRuleError
    );
  });

  it("throws InvalidChargeTaxRuleError in updateTax for overlapping rules", () => {
    const charge = new ChargeModel(buildChargeData([rule1.getDetails()]));
    assert.throws(() => charge.updateTax([rule1, rule2Overlapping]), InvalidChargeTaxRuleError);
  });

  it("does NOT throw in updateTax for non-overlapping rules", () => {
    const charge = new ChargeModel(buildChargeData([rule1.getDetails()]));
    assert.doesNotThrow(() => charge.updateTax([rule1, rule3Adjacent]));
  });

  it("does NOT throw for rules with identical slabs", () => {
    const parallelRule = new TaxRuleModel({
      taxRuleId: "r1-parallel",
      taxCategory: "standard",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "SGST",
      country: "IN",
      rate: 0.09,
      minPrice: { amount: 0, currency },
      maxPrice: { amount: 100, currency },
      effectiveFrom: new Date().toISOString(),
    });

    assert.doesNotThrow(() => new ChargeModel(buildChargeData([rule1.getDetails(), parallelRule.getDetails()])));
  });

  it("allows touching slabs when one touching boundary is excluded", () => {
    const leftExclusiveMax = new TaxRuleModel({
      taxRuleId: "r-left",
      taxCategory: "standard",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "IGST",
      country: "IN",
      rate: 0.05,
      minPrice: { amount: 0, currency },
      maxPrice: { amount: 100, currency },
      excludeMax: true,
      effectiveFrom: new Date().toISOString(),
    });
    const right = new TaxRuleModel({
      taxRuleId: "r-right",
      taxCategory: "standard",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "IGST",
      country: "IN",
      rate: 0.12,
      minPrice: { amount: 100, currency },
      maxPrice: { amount: 200, currency },
      effectiveFrom: new Date().toISOString(),
    });

    assert.doesNotThrow(() => new ChargeModel(buildChargeData([leftExclusiveMax.getDetails(), right.getDetails()])));
  });

  it("treats touching inclusive slabs as overlap", () => {
    const left = new TaxRuleModel({
      taxRuleId: "r-left-inclusive",
      taxCategory: "standard",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "IGST",
      country: "IN",
      rate: 0.05,
      minPrice: { amount: 0, currency },
      maxPrice: { amount: 100, currency },
      effectiveFrom: new Date().toISOString(),
    });
    const right = new TaxRuleModel({
      taxRuleId: "r-right-inclusive",
      taxCategory: "standard",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "IGST",
      country: "IN",
      rate: 0.12,
      minPrice: { amount: 100, currency },
      maxPrice: { amount: 200, currency },
      effectiveFrom: new Date().toISOString(),
    });

    assert.throws(() => new ChargeModel(buildChargeData([left.getDetails(), right.getDetails()])), InvalidChargeTaxRuleError);
  });
});

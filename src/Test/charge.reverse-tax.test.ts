import assert from "node:assert/strict";
import ChargeModel, { ChargeAttributes } from "../Classes/Charge";
import { ChargeImpact, ChargeType, TaxSystem } from "../Classes/Enum";
import { TaxRuleData } from "../Classes/TaxRule";

const INFINITE_MAX_RULE_RANGE = undefined;

function createTaxRule(data: {
  id: string;
  subSystem: string;
  rate: number;
  minPrice?: number;
  maxPrice?: number;
  excludeMin?: boolean;
  excludeMax?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}): TaxRuleData {
  return {
    taxRuleId: data.id,
    taxCategory: "APPAREL",
    taxSystem: TaxSystem.GST,
    taxSubSystem: data.subSystem,
    country: "IN",
    rate: data.rate,
    minPrice: { amount: data.minPrice ?? 0, currency: "INR" },
    maxPrice: data.maxPrice !== undefined ? { amount: data.maxPrice, currency: "INR" } : INFINITE_MAX_RULE_RANGE,
    excludeMin: data.excludeMin,
    excludeMax: data.excludeMax,
    effectiveFrom: data.effectiveFrom ?? "2020-01-01T00:00:00.000Z",
    effectiveTo: data.effectiveTo,
    customFields: {},
  };
}

function createCharge(
  baseChargeAmount: number,
  rules: TaxRuleData[],
  options?: {
    discounts?: Record<string, number>;
  }
): ChargeModel {
  const discounts = Object.fromEntries(
    Object.entries(options?.discounts ?? {}).map(([code, amount]) => [
      code,
      { amount, currency: "INR" as const },
    ])
  );

  const chargeData: ChargeAttributes = {
    id: "shipping",
    name: { en: "Shipping Charge" },
    category: "SHIPPING",
    type: ChargeType.SHIPPING,
    impact: ChargeImpact.ADD,
    pricing: {
      baseChargeAmount: { amount: baseChargeAmount, currency: "INR" },
      taxCategory: "APPAREL",
      applicableTaxRule: rules,
    },
    total: {
      chargeAmount: { amount: baseChargeAmount, currency: "INR" },
      discountBreakdown: discounts,
      discountTotal: { amount: 0, currency: "INR" },
      netChargeAmount: { amount: baseChargeAmount, currency: "INR" },
      taxTotal: { amount: 0, currency: "INR" },
      taxBreakdown: {},
      grandTotal: { amount: 0, currency: "INR" },
    },
    customFields: {},
  };

  return new ChargeModel(chargeData);
}

describe("Charge reverse tax calculation", () => {
  it("reverse calculates base and tax for a single fixed tax rule", () => {
    const charge = createCharge(118, [createTaxRule({ id: "GST18", subSystem: "IGST", rate: 0.18 })]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const breakdown = totals.taxBreakdown["GST18"];

    assert.equal(totals.grandTotal.getAmount(), 118);
    assert.equal(totals.netChargeAmount.getAmount(), 118);
    assert.equal(totals.taxTotal.getAmount(), 18);
    assert.equal(breakdown.rate, 0.18);
    assert.equal(breakdown.taxableAmount.getAmount(), 100);
    assert.equal(breakdown.taxAmount.getAmount(), 18);
  });

  it("reverse calculates shared taxable base across multiple tax rules", () => {
    const charge = createCharge(118, [
      createTaxRule({ id: "CGST9", subSystem: "CGST", rate: 0.09 }),
      createTaxRule({ id: "SGST9", subSystem: "SGST", rate: 0.09 }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const cgst = totals.taxBreakdown["CGST9"];
    const sgst = totals.taxBreakdown["SGST9"];

    assert.equal(totals.grandTotal.getAmount(), 118);
    assert.equal(totals.netChargeAmount.getAmount(), 118);
    assert.equal(totals.taxTotal.getAmount(), 18);
    assert.equal(cgst.rate, 0.09);
    assert.equal(sgst.rate, 0.09);
    assert.equal(cgst.taxableAmount.getAmount(), 100);
    assert.equal(sgst.taxableAmount.getAmount(), 100);
    assert.equal(cgst.taxAmount.getAmount(), 9);
    assert.equal(sgst.taxAmount.getAmount(), 9);
  });

  it("reverse calculation remains consistent when discounts change inclusive gross", () => {
    const charge = createCharge(100, [createTaxRule({ id: "GST10", subSystem: "IGST", rate: 0.1 })]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const breakdown = totals.taxBreakdown["GST10"];

    assert.equal(totals.grandTotal.getAmount(), 100);
    assert.equal(totals.netChargeAmount.getAmount(), 100);
    assert.equal(totals.taxTotal.getAmount(), 9.09);
    assert.equal(breakdown.rate, 0.1);
    assert.equal(breakdown.taxableAmount.getAmount(), 90.91);
    assert.equal(breakdown.taxAmount.getAmount(), 9.09);
  });

  it("applies the lower tax band for lower priced charges", () => {
    const charge = createCharge(210, [
      createTaxRule({ id: "GST5", subSystem: "IGST", rate: 0.05, minPrice: 0, maxPrice: 200 }),
      createTaxRule({ id: "GST12", subSystem: "IGST", rate: 0.12, minPrice: 200, excludeMin: true }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const lowBand = totals.taxBreakdown["GST5"];
    const highBand = totals.taxBreakdown["GST12"];

    assert.equal(totals.grandTotal.getAmount(), 210);
    assert.equal(totals.netChargeAmount.getAmount(), 210);
    assert.equal(totals.taxTotal.getAmount(), 10);
    assert.equal(lowBand.rate, 0.05);
    assert.equal(lowBand.taxableAmount.getAmount(), 200);
    assert.equal(lowBand.taxAmount.getAmount(), 10);
    assert.equal(highBand.rate, 0);
    assert.equal(highBand.taxAmount.getAmount(), 0);
  });

  it("applies the higher tax band for higher priced charges", () => {
    const charge = createCharge(280, [
      createTaxRule({ id: "GST5", subSystem: "IGST", rate: 0.05, minPrice: 0, maxPrice: 200 }),
      createTaxRule({ id: "GST12", subSystem: "IGST", rate: 0.12, minPrice: 200, excludeMin: true }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const lowBand = totals.taxBreakdown["GST5"];
    const highBand = totals.taxBreakdown["GST12"];

    assert.equal(totals.grandTotal.getAmount(), 280);
    assert.equal(totals.netChargeAmount.getAmount(), 280);
    assert.equal(totals.taxTotal.getAmount(), 30);
    assert.equal(lowBand.rate, 0);
    assert.equal(lowBand.taxAmount.getAmount(), 0);
    assert.equal(highBand.rate, 0.12);
    assert.equal(highBand.taxableAmount.getAmount(), 250);
    assert.equal(highBand.taxAmount.getAmount(), 30);
  });

  it("uses excludeMax to move boundary amount to the next slab", () => {
    const charge = createCharge(224, [
      createTaxRule({ id: "GST5", subSystem: "IGST", rate: 0.05, minPrice: 0, maxPrice: 200, excludeMax: true }),
      createTaxRule({ id: "GST12", subSystem: "IGST", rate: 0.12, minPrice: 200 }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const lowBand = totals.taxBreakdown["GST5"];
    const highBand = totals.taxBreakdown["GST12"];

    assert.equal(totals.grandTotal.getAmount(), 224);
    assert.equal(totals.taxTotal.getAmount(), 24);
    assert.equal(lowBand.rate, 0);
    assert.equal(lowBand.taxAmount.getAmount(), 0);
    assert.equal(highBand.rate, 0.12);
    assert.equal(highBand.taxableAmount.getAmount(), 200);
    assert.equal(highBand.taxAmount.getAmount(), 24);
  });

  it("treats maxPrice as inclusive at the boundary", () => {
    const charge = createCharge(224, [
      createTaxRule({ id: "CGST6", subSystem: "CGST", rate: 0.06, minPrice: 0, maxPrice: 200 }),
      createTaxRule({ id: "SGST6", subSystem: "SGST", rate: 0.06, minPrice: 0, maxPrice: 200 }),
      createTaxRule({ id: "GST12", subSystem: "IGST", rate: 0.12, minPrice: 200.000001 }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const lowBand = totals.taxBreakdown["CGST6"];
    const highBand = totals.taxBreakdown["GST12"];
    assert.equal(totals.grandTotal.getAmount(), 224);
    assert.equal(totals.netChargeAmount.getAmount(), 224);
    assert.equal(totals.taxTotal.getAmount(), 24);
    assert.equal(lowBand.rate, 0.06);
    assert.equal(lowBand.taxableAmount.getAmount(), 200);
    assert.equal(lowBand.taxAmount.getAmount(), 12);
    assert.equal(highBand.rate, 0);
    assert.equal(highBand.taxAmount.getAmount(), 0);
  });

  it("returns zero tax when no tax rules are configured", () => {
    const charge = createCharge(250, []);
    charge.calculateTotals();

    const totals = charge.getTotal();
    assert.equal(totals.grandTotal.getAmount(), 250);
    assert.equal(totals.netChargeAmount.getAmount(), 250);
    assert.equal(totals.taxTotal.getAmount(), 0);
    assert.deepEqual(totals.taxBreakdown, {});
  });

  it("returns zero tax when no rule is applicable for the gross amount", () => {
    const charge = createCharge(120, [
      createTaxRule({ id: "GST12-HIGH", subSystem: "IGST", rate: 0.12, minPrice: 500 }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    assert.equal(totals.grandTotal.getAmount(), 120);
    assert.equal(totals.netChargeAmount.getAmount(), 120);
    assert.equal(totals.taxTotal.getAmount(), 0);
    assert.deepEqual(totals.taxBreakdown, {});
  });

  it("handles reverse calculation rounding for repeating decimal bases", () => {
    const charge = createCharge(101, [createTaxRule({ id: "GST18", subSystem: "IGST", rate: 0.18 })]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const breakdown = totals.taxBreakdown["GST18"];
    assert.equal(totals.grandTotal.getAmount(), 101);
    assert.equal(totals.netChargeAmount.getAmount(), 101);
    assert.equal(totals.taxTotal.getAmount(), 15.41);
    assert.equal(breakdown.taxableAmount.getAmount(), 85.59);
    assert.equal(breakdown.taxAmount.getAmount(), 15.41);
  });

  it("applies only active rules when another matching rule is expired", () => {
    const charge = createCharge(105, [
      createTaxRule({
        id: "GST18-OLD",
        subSystem: "IGST",
        rate: 0.18,
        minPrice: 0,
        effectiveFrom: "2019-01-01T00:00:00.000Z",
        effectiveTo: "2021-01-01T00:00:00.000Z",
      }),
      createTaxRule({
        id: "GST5-NEW",
        subSystem: "IGST",
        rate: 0.05,
        minPrice: 0,
        effectiveFrom: "2022-01-01T00:00:00.000Z",
      }),
    ]);
    charge.calculateTotals();

    const totals = charge.getTotal();
    const oldRule = totals.taxBreakdown["GST18-OLD"];
    const newRule = totals.taxBreakdown["GST5-NEW"];

    assert.equal(totals.grandTotal.getAmount(), 105);
    assert.equal(totals.netChargeAmount.getAmount(), 105);
    assert.equal(totals.taxTotal.getAmount(), 5);
    assert.equal(oldRule.rate, 0);
    assert.equal(oldRule.taxAmount.getAmount(), 0);
    assert.equal(newRule.rate, 0.05);
    assert.equal(newRule.taxAmount.getAmount(), 5);
  });
});

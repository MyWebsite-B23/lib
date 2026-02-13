import assert from "node:assert/strict";
import PriceModel from "../Classes/Price";
import { TaxSystem } from "../Classes/Enum";
import { TaxRuleModel } from "../Classes/TaxRule";

describe("TaxRule boundary exclusions", () => {
  const currency = "INR" as const;

  const buildRule = (overrides: Partial<ConstructorParameters<typeof TaxRuleModel>[0]> = {}) =>
    new TaxRuleModel({
      taxRuleId: "r1",
      taxCategory: "APPAREL",
      taxSystem: TaxSystem.GST,
      taxSubSystem: "IGST",
      country: "IN",
      rate: 0.12,
      minPrice: { amount: 100, currency },
      maxPrice: { amount: 200, currency },
      effectiveFrom: "2020-01-01T00:00:00.000Z",
      customFields: {},
      ...overrides,
    });

  it("is inclusive by default at min and max", () => {
    const rule = buildRule();
    const minPrice = new PriceModel({ amount: 100, currency });
    const maxPrice = new PriceModel({ amount: 200, currency });

    assert.equal(rule.appliesTo("APPAREL", "IN", minPrice), true);
    assert.equal(rule.appliesTo("APPAREL", "IN", maxPrice), true);
  });

  it("excludes the min boundary when excludeMin is true", () => {
    const rule = buildRule({ excludeMin: true });
    const minPrice = new PriceModel({ amount: 100, currency });
    const aboveMin = new PriceModel({ amount: 100.01, currency });

    assert.equal(rule.appliesTo("APPAREL", "IN", minPrice), false);
    assert.equal(rule.appliesTo("APPAREL", "IN", aboveMin), true);
  });

  it("excludes the max boundary when excludeMax is true", () => {
    const rule = buildRule({ excludeMax: true });
    const maxPrice = new PriceModel({ amount: 200, currency });
    const belowMax = new PriceModel({ amount: 199.99, currency });

    assert.equal(rule.appliesTo("APPAREL", "IN", maxPrice), false);
    assert.equal(rule.appliesTo("APPAREL", "IN", belowMax), true);
  });

  it("serializes default exclusion flags as false", () => {
    const details = buildRule().getDetails();
    assert.equal(details.excludeMin, false);
    assert.equal(details.excludeMax, false);
  });

  it("serializes explicit exclusion flags as true", () => {
    const details = buildRule({ excludeMin: true, excludeMax: true }).getDetails();
    assert.equal(details.excludeMin, true);
    assert.equal(details.excludeMax, true);
  });
});


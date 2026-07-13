import { describe, expect, it } from "vitest";
import { computeSummary } from "@/lib/projection/summary";

describe("computeSummary", () => {
  it("assembles wages + brokerage income into fed/CA waterfalls and computes refund/owed", () => {
    const result = computeSummary({
      taxProfile: {
        taxYear: 2026,
        filingStatus: "mfj",
        dependents: 0,
        useItemized: false,
        itemizedFederal: 0,
        itemizedCA: 0,
        otherJointIncome: 0,
      },
      household: {
        wages: 200000,
        federalWithholding: 30000,
        stateWithholding: 12000,
      },
      brokerage: { stGains: 0, ltGains: 5000, qualifiedDiv: 1000, ordinaryDiv: 500, interest: 200 },
    });

    expect(result.federal.wages).toBe(200000);
    expect(result.federal.totalIncome).toBe(200000 + 5000 + 1000 + 500 + 200);
    expect(result.federal.deduction).toBe(32200); // 2026 MFJ standard deduction
    expect(result.federal.refundOrOwed).toBe(
      Math.round((30000 - result.federal.totalTax) * 100) / 100,
    );

    // CA taxes gains/dividends as ordinary income -- no separate LTCG line.
    expect(result.california.extraTaxBreakdown).not.toHaveProperty("ltcgTax");
    expect(result.california.refundOrOwed).toBe(
      Math.round((12000 - result.california.totalTax) * 100) / 100,
    );
  });

  it("itemized deductions override the standard deduction when useItemized is true", () => {
    const standard = computeSummary({
      taxProfile: {
        taxYear: 2026,
        filingStatus: "single",
        dependents: 0,
        useItemized: false,
        itemizedFederal: 40000,
        itemizedCA: 20000,
        otherJointIncome: 0,
      },
      household: { wages: 150000, federalWithholding: 0, stateWithholding: 0 },
      brokerage: { stGains: 0, ltGains: 0, qualifiedDiv: 0, ordinaryDiv: 0, interest: 0 },
    });
    const itemized = computeSummary({
      taxProfile: {
        taxYear: 2026,
        filingStatus: "single",
        dependents: 0,
        useItemized: true,
        itemizedFederal: 40000,
        itemizedCA: 20000,
        otherJointIncome: 0,
      },
      household: { wages: 150000, federalWithholding: 0, stateWithholding: 0 },
      brokerage: { stGains: 0, ltGains: 0, qualifiedDiv: 0, ordinaryDiv: 0, interest: 0 },
    });
    expect(standard.federal.deduction).toBe(16100);
    expect(itemized.federal.deduction).toBe(40000);
    expect(itemized.federal.taxableIncome).toBeLessThan(standard.federal.taxableIncome);
  });
});

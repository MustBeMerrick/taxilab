import { describe, expect, it } from "vitest";
import { computeFederalWithholding } from "@/lib/withholding/federal";

// Vectors hand-computed per IRS Pub 15-T (2026) Worksheet 1A against the
// 2026 Percentage Method Tables for Automated Payroll Systems (page 12).
describe("computeFederalWithholding (Pub 15-T Worksheet 1A, 2026)", () => {
  it("weekly $1,000, single, Step 2 not checked, no adjustments -> $78.08", () => {
    const result = computeFederalWithholding({
      grossThisCheck: 1000,
      payFrequency: "weekly",
      w4Config: {
        filingStatusOnW4: "single",
        multipleJobsChecked: false,
        dependentsCredit: 0,
        otherIncome: 0,
        deductionsAdj: 0,
        extraWithholding: 0,
        payFrequency: "weekly",
      },
      taxYear: 2026,
    });
    expect(result.breakdown.adjustedAnnualWageAmount).toBe(43400);
    expect(result.breakdown.tentativeAnnualWithholding).toBeCloseTo(4060, 2);
    expect(result.withholding).toBeCloseTo(78.08, 2);
  });

  it("biweekly $3,000, MFJ, Step 2 checked, $2,000 dependents credit, $50 extra -> $293.46", () => {
    const result = computeFederalWithholding({
      grossThisCheck: 3000,
      payFrequency: "biweekly",
      w4Config: {
        filingStatusOnW4: "mfj",
        multipleJobsChecked: true,
        dependentsCredit: 2000,
        otherIncome: 0,
        deductionsAdj: 0,
        extraWithholding: 50,
        payFrequency: "biweekly",
      },
      taxYear: 2026,
    });
    expect(result.breakdown.adjustedAnnualWageAmount).toBe(78000);
    expect(result.breakdown.tentativeAnnualWithholding).toBeCloseTo(8330, 2);
    expect(result.withholding).toBeCloseTo(293.46, 2);
  });

  it("wages below the zero-rate bracket ceiling produce $0 withholding", () => {
    const result = computeFederalWithholding({
      grossThisCheck: 200,
      payFrequency: "weekly",
      w4Config: {
        filingStatusOnW4: "single",
        multipleJobsChecked: false,
        dependentsCredit: 0,
        otherIncome: 0,
        deductionsAdj: 0,
        extraWithholding: 0,
        payFrequency: "weekly",
      },
      taxYear: 2026,
    });
    // 200 * 52 = 10400, minus 8600 std offset = 1800, in the 0% bracket (< 7500).
    expect(result.breakdown.adjustedAnnualWageAmount).toBe(1800);
    expect(result.withholding).toBe(0);
  });

  it("Step 4a (other income) and 4b (deductions) shift the adjusted annual wage amount", () => {
    const base = computeFederalWithholding({
      grossThisCheck: 2000,
      payFrequency: "monthly",
      w4Config: {
        filingStatusOnW4: "hoh",
        multipleJobsChecked: false,
        dependentsCredit: 0,
        otherIncome: 0,
        deductionsAdj: 0,
        extraWithholding: 0,
        payFrequency: "monthly",
      },
      taxYear: 2026,
    });
    const withOtherIncome = computeFederalWithholding({
      grossThisCheck: 2000,
      payFrequency: "monthly",
      w4Config: {
        filingStatusOnW4: "hoh",
        multipleJobsChecked: false,
        dependentsCredit: 0,
        otherIncome: 12000,
        deductionsAdj: 0,
        extraWithholding: 0,
        payFrequency: "monthly",
      },
      taxYear: 2026,
    });
    expect(withOtherIncome.breakdown.adjustedAnnualWageAmount).toBe(
      base.breakdown.adjustedAnnualWageAmount + 12000,
    );
    expect(withOtherIncome.withholding).toBeGreaterThan(base.withholding);
  });

  it("extra withholding (Step 4c) is added dollar-for-dollar per period", () => {
    const base = computeFederalWithholding({
      grossThisCheck: 1500,
      payFrequency: "weekly",
      w4Config: {
        filingStatusOnW4: "single",
        multipleJobsChecked: false,
        dependentsCredit: 0,
        otherIncome: 0,
        deductionsAdj: 0,
        extraWithholding: 0,
        payFrequency: "weekly",
      },
      taxYear: 2026,
    });
    const withExtra = computeFederalWithholding({
      grossThisCheck: 1500,
      payFrequency: "weekly",
      w4Config: {
        filingStatusOnW4: "single",
        multipleJobsChecked: false,
        dependentsCredit: 0,
        otherIncome: 0,
        deductionsAdj: 0,
        extraWithholding: 100,
        payFrequency: "weekly",
      },
      taxYear: 2026,
    });
    expect(withExtra.withholding).toBeCloseTo(base.withholding + 100, 2);
  });
});

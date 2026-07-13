import { describe, expect, it } from "vitest";
import { computeFederalLiability } from "@/lib/liability/federal";

const base = {
  taxYear: 2026,
  ordinaryDividends: 0,
  qualifiedDividends: 0,
  interest: 0,
  shortTermGains: 0,
  longTermGains: 0,
  otherIncome: 0,
  dependents: 0,
};

describe("computeFederalLiability (2026 brackets)", () => {
  it("MFJ, wages-only, standard deduction: matches hand-computed bracket math", () => {
    const result = computeFederalLiability({
      ...base,
      filingStatus: "mfj",
      wages: 150000,
      deductionAmount: 32200,
    });
    // taxable income 117,800 falls in the 22% bracket (100,800-211,400, base 11,600).
    expect(result.taxableIncome).toBe(117800);
    expect(result.ordinaryTax).toBeCloseTo(15340, 2);
    expect(result.ltcgTax).toBe(0);
    expect(result.totalTax).toBeCloseTo(15340, 2);
  });

  it("wages below the standard deduction produce zero tax", () => {
    const result = computeFederalLiability({
      ...base,
      filingStatus: "single",
      wages: 10000,
      deductionAmount: 16100,
    });
    expect(result.taxableIncome).toBe(0);
    expect(result.totalTax).toBe(0);
  });

  describe("LTCG stacking (0% / 15% / 20% bands)", () => {
    it("LTCG straddles the zero-rate and 15% bands", () => {
      const result = computeFederalLiability({
        ...base,
        filingStatus: "mfj",
        wages: 80000,
        longTermGains: 100000,
        deductionAmount: 32200,
      });
      expect(result.ordinaryTaxableIncome).toBe(47800);
      // 12% bracket (24,800-100,800), base 2,480: 2,480 + (47,800-24,800)*0.12 = 5,240.
      expect(result.ordinaryTax).toBeCloseTo(5240, 2);
      // 0% band absorbs 98,900-47,800=51,100; remaining 48,900 at 15%.
      expect(result.ltcgTax).toBeCloseTo(48900 * 0.15, 2);
      expect(result.niit).toBe(0); // MAGI 180,000 < 250,000 MFJ NIIT threshold
    });

    it("LTCG straddles the 0/15% boundary entirely within the gains (mid-income case)", () => {
      const result = computeFederalLiability({
        ...base,
        filingStatus: "mfj",
        wages: 90000,
        longTermGains: 50000,
        deductionAmount: 32200,
      });
      expect(result.ordinaryTaxableIncome).toBe(57800);
      // zero band: 98,900-57,800=41,100; fifteen band: 107,800-98,900=8,900.
      expect(result.ltcgTax).toBeCloseTo(8900 * 0.15, 2);
    });

    it("high ordinary income pushes all LTCG into the 20% band", () => {
      const result = computeFederalLiability({
        ...base,
        filingStatus: "single",
        wages: 600000,
        longTermGains: 200000,
        deductionAmount: 16100,
      });
      expect(result.ordinaryTaxableIncome).toBe(583900);
      expect(result.ltcgTax).toBeCloseTo(200000 * 0.2, 2);
    });
  });

  it("NIIT applies 3.8% to the lesser of net investment income or MAGI over threshold", () => {
    const result = computeFederalLiability({
      ...base,
      filingStatus: "mfj",
      wages: 260000,
      interest: 30000,
      deductionAmount: 32200,
    });
    // MAGI = 290,000; excess over 250,000 = 40,000; net investment income = 30,000.
    // Lesser of the two -> 30,000 * 3.8%.
    expect(result.niit).toBeCloseTo(30000 * 0.038, 2);
  });

  it("Additional Medicare Tax applies 0.9% to wages over the filing-status threshold", () => {
    const result = computeFederalLiability({
      ...base,
      filingStatus: "single",
      wages: 260000,
      deductionAmount: 16100,
    });
    expect(result.addlMedicare).toBeCloseTo((260000 - 200000) * 0.009, 2);
  });
});

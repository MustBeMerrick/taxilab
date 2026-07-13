import { describe, expect, it } from "vitest";
import { computeCaLiability } from "@/lib/liability/california";

const base = {
  taxYear: 2026,
  ordinaryDividends: 0,
  qualifiedDividends: 0,
  interest: 0,
  shortTermGains: 0,
  otherIncome: 0,
  dependents: 0,
};

describe("computeCaLiability (2026 brackets)", () => {
  it("taxes long-term gains as ordinary income (no preferential rate)", () => {
    const result = computeCaLiability({
      ...base,
      filingStatus: "single",
      wages: 100000,
      longTermGains: 20000,
      deductionAmount: 5706,
    });
    expect(result.taxableIncome).toBe(114294);
    // 10.23% bracket (72,724-371,479), base 3,522.17, minus 1 personal exemption credit.
    expect(result.ordinaryTax).toBeCloseTo(3522.17 + (114294 - 72724) * 0.1023 - 168.3, 2);
  });

  it("personal + dependent exemption credits reduce tax, floored at zero", () => {
    const withDependents = computeCaLiability({
      ...base,
      filingStatus: "mfj",
      wages: 60000,
      longTermGains: 0,
      deductionAmount: 11412,
      dependents: 2,
    });
    const withoutDependents = computeCaLiability({
      ...base,
      filingStatus: "mfj",
      wages: 60000,
      longTermGains: 0,
      deductionAmount: 11412,
      dependents: 0,
    });
    expect(withDependents.ordinaryTax).toBeLessThan(withoutDependents.ordinaryTax);
  });

  it("Mental Health Services Tax adds 1% above $1,000,000 taxable income, flat regardless of filing status", () => {
    const single = computeCaLiability({
      ...base,
      filingStatus: "single",
      wages: 1200000,
      longTermGains: 0,
      deductionAmount: 5706,
    });
    const mfj = computeCaLiability({
      ...base,
      filingStatus: "mfj",
      wages: 1200000,
      longTermGains: 0,
      deductionAmount: 11412,
    });
    expect(single.mentalHealthServicesTax).toBeCloseTo((single.taxableIncome - 1000000) * 0.01, 2);
    expect(mfj.mentalHealthServicesTax).toBeCloseTo((mfj.taxableIncome - 1000000) * 0.01, 2);
  });

  it("no Mental Health Services Tax below the $1,000,000 threshold", () => {
    const result = computeCaLiability({
      ...base,
      filingStatus: "single",
      wages: 200000,
      longTermGains: 0,
      deductionAmount: 5706,
    });
    expect(result.mentalHealthServicesTax).toBe(0);
  });
});

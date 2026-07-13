import { describe, expect, it } from "vitest";
import { computeFicaForPaycheck } from "@/lib/fica";

describe("computeFicaForPaycheck (2026 OASDI/SDI caps)", () => {
  it("taxes the full check when nowhere near the wage base", () => {
    const result = computeFicaForPaycheck({
      grossThisCheck: 5000,
      cumulativeWagesBeforeThisCheck: 20000,
      taxYear: 2026,
    });
    expect(result.oasdi).toBeCloseTo(5000 * 0.062, 2);
    expect(result.medicare).toBeCloseTo(5000 * 0.0145, 2);
    expect(result.caSdi).toBeCloseTo(5000 * 0.013, 2);
  });

  it("caps OASDI at the wage base for a check that pushes over it mid-check", () => {
    // wage base is 184500; already at 183000, this check is 5000 -> only 1500 taxable.
    const result = computeFicaForPaycheck({
      grossThisCheck: 5000,
      cumulativeWagesBeforeThisCheck: 183000,
      taxYear: 2026,
    });
    expect(result.oasdi).toBeCloseTo(1500 * 0.062, 2);
    // Medicare has no cap and is unaffected.
    expect(result.medicare).toBeCloseTo(5000 * 0.0145, 2);
  });

  it("charges zero OASDI once already past the wage base", () => {
    const result = computeFicaForPaycheck({
      grossThisCheck: 5000,
      cumulativeWagesBeforeThisCheck: 200000,
      taxYear: 2026,
    });
    expect(result.oasdi).toBe(0);
  });

  it("CA SDI has no wage cap in 2026 (SB 951)", () => {
    const result = computeFicaForPaycheck({
      grossThisCheck: 5000,
      cumulativeWagesBeforeThisCheck: 500000,
      taxYear: 2026,
    });
    expect(result.caSdi).toBeCloseTo(5000 * 0.013, 2);
  });
});

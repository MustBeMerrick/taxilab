import { describe, expect, it } from "vitest";
import {
  summarizeEarnerPaychecks,
  combineHouseholdPaychecks,
  type PaycheckRow,
} from "@/lib/projection/paychecks";

function row(overrides: Partial<PaycheckRow>): PaycheckRow {
  return {
    payDate: new Date("2026-01-01"),
    gross: 1000,
    federalWH: 100,
    stateWH: 50,
    hsaPreTax: 0,
    nonHsaPreTax: 0,
    gtli: 0,
    paidOut: false,
    ...overrides,
  };
}

describe("summarizeEarnerPaychecks", () => {
  it("sums gross/withholding correctly and splits YTD vs projected", () => {
    const rows = [
      row({ payDate: new Date("2026-01-15"), gross: 5000, federalWH: 500, stateWH: 200, paidOut: true }),
      row({ payDate: new Date("2026-02-15"), gross: 5000, federalWH: 500, stateWH: 200, paidOut: false }),
    ];
    const summary = summarizeEarnerPaychecks(rows, 2026);
    expect(summary.ytdGross).toBe(5000);
    expect(summary.projectedGross).toBe(10000);
    expect(summary.ytdFederalWH).toBe(500);
    expect(summary.projectedFederalWH).toBe(1000);
  });

  it("Box 1 wages = gross - HSA - other pretax + GTLI", () => {
    const rows = [
      row({ gross: 5000, hsaPreTax: 200, nonHsaPreTax: 300, gtli: 10, paidOut: true }),
    ];
    const summary = summarizeEarnerPaychecks(rows, 2026);
    expect(summary.ytdBox1Wages).toBeCloseTo(5000 - 200 - 300 + 10, 2);
  });

  it("applies the OASDI wage-base cap per paycheck in chronological order, including a mid-check crossing", () => {
    // 2026 OASDI wage base = 184,500. Three checks of 90,000 each pushes the
    // third check over the cap mid-check: cumulative before check 3 = 180,000,
    // so only 4,500 of the 90,000 in check 3 is OASDI-taxable.
    const rows = [
      row({ payDate: new Date("2026-01-01"), gross: 90000 }),
      row({ payDate: new Date("2026-02-01"), gross: 90000 }),
      row({ payDate: new Date("2026-03-01"), gross: 90000 }),
    ];
    const summary = summarizeEarnerPaychecks(rows, 2026);
    const expectedOasdi = 184500 * 0.062;
    expect(summary.projectedOasdi).toBeCloseTo(expectedOasdi, 2);
  });

  it("rows are summed regardless of input order (sorts by payDate internally)", () => {
    const inOrder = [
      row({ payDate: new Date("2026-01-01"), gross: 90000 }),
      row({ payDate: new Date("2026-03-01"), gross: 90000 }),
      row({ payDate: new Date("2026-02-01"), gross: 90000 }),
    ];
    const reversed = [...inOrder].reverse();
    expect(summarizeEarnerPaychecks(inOrder, 2026).projectedOasdi).toBeCloseTo(
      summarizeEarnerPaychecks(reversed, 2026).projectedOasdi,
      2,
    );
  });
});

describe("combineHouseholdPaychecks", () => {
  it("sums independently-capped earner summaries without re-applying a household-wide cap", () => {
    // Each earner independently near the wage base; household total should
    // be the SUM of each earner's own OASDI, not capped again at the household level.
    const earnerA = summarizeEarnerPaychecks(
      [row({ gross: 184500, paidOut: true })],
      2026,
    );
    const earnerB = summarizeEarnerPaychecks(
      [row({ gross: 184500, paidOut: true })],
      2026,
    );
    const household = combineHouseholdPaychecks([earnerA, earnerB]);
    expect(household.ytdOasdi).toBeCloseTo(2 * 184500 * 0.062, 2);
  });
});

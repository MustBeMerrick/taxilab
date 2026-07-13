import { describe, expect, it } from "vitest";
import { applyWhatIfOverlay, computeWhatIf } from "@/lib/projection/what-if";
import type { PaycheckRow } from "@/lib/projection/paychecks";
import { computeFederalWithholding, type W4ConfigInput } from "@/lib/withholding/federal";
import { computeCaWithholding, type DE4ConfigInput } from "@/lib/withholding/california";

const w4Low: W4ConfigInput = {
  filingStatusOnW4: "single",
  multipleJobsChecked: false,
  dependentsCredit: 0,
  otherIncome: 0,
  deductionsAdj: 0,
  extraWithholding: 0,
  payFrequency: "biweekly",
};

const w4WithExtra: W4ConfigInput = { ...w4Low, extraWithholding: 200 };

const de4: DE4ConfigInput = {
  filingStatus: "single",
  regularAllowances: 1,
  estimatedDeductions: 0,
  additionalWithholding: 0,
  payFrequency: "biweekly",
};

function row(overrides: Partial<PaycheckRow>): PaycheckRow {
  return {
    payDate: new Date("2026-01-01"),
    gross: 3000,
    federalWH: 300,
    stateWH: 100,
    hsaPreTax: 0,
    nonHsaPreTax: 0,
    gtli: 0,
    paidOut: false,
    ...overrides,
  };
}

describe("applyWhatIfOverlay", () => {
  const rows: PaycheckRow[] = [
    row({ payDate: new Date("2026-01-15"), paidOut: true, federalWH: 999 }), // paid -- must stay untouched
    row({ payDate: new Date("2026-02-15"), paidOut: false, federalWH: 999 }), // before effective date -- untouched
    row({ payDate: new Date("2026-06-01"), paidOut: false, federalWH: 999 }), // unpaid, on/after -- overlaid
    row({ payDate: new Date("2026-09-01"), paidOut: false, federalWH: 999 }), // unpaid, on/after -- overlaid
  ];
  const effectiveDate = new Date("2026-06-01");

  it("only recomputes withholding for unpaid rows on/after the effective date", () => {
    const overlaid = applyWhatIfOverlay(rows, effectiveDate, "biweekly", w4WithExtra, de4, 2026);

    expect(overlaid[0].federalWH).toBe(999); // paid, untouched
    expect(overlaid[1].federalWH).toBe(999); // before effective date, untouched
    expect(overlaid[2].federalWH).not.toBe(999); // overlaid
    expect(overlaid[3].federalWH).not.toBe(999); // overlaid
  });

  it("does not mutate the input rows array", () => {
    const before = rows.map((r) => ({ ...r }));
    applyWhatIfOverlay(rows, effectiveDate, "biweekly", w4WithExtra, de4, 2026);
    expect(rows).toEqual(before);
  });

  it("the $200 extra withholding shows up dollar-for-dollar in overlaid rows", () => {
    const baselineOverlay = applyWhatIfOverlay(rows, effectiveDate, "biweekly", w4Low, de4, 2026);
    const withExtra = applyWhatIfOverlay(rows, effectiveDate, "biweekly", w4WithExtra, de4, 2026);
    expect(withExtra[2].federalWH).toBeCloseTo(baselineOverlay[2].federalWH + 200, 2);
  });
});

describe("computeWhatIf", () => {
  const taxProfile = {
    taxYear: 2026,
    filingStatus: "single" as const,
    dependents: 0,
    useItemized: false,
    itemizedFederal: 0,
    itemizedCA: 0,
    otherJointIncome: 0,
  };
  const brokerage = { stGains: 0, ltGains: 0, qualifiedDiv: 0, ordinaryDiv: 0, interest: 0 };

  it("increasing extra withholding on unpaid checks increases the projected refund by the same amount", () => {
    // Baseline stored federalWH must reflect what w4Low actually computes,
    // so the only delta between baseline and what-if is the +$200 extra.
    const baselineFed = computeFederalWithholding({
      grossThisCheck: 3000,
      payFrequency: "biweekly",
      w4Config: w4Low,
      taxYear: 2026,
    }).withholding;
    const baselineCa = computeCaWithholding({
      grossThisCheck: 3000,
      payFrequency: "biweekly",
      de4Config: de4,
      taxYear: 2026,
    }).withholding;
    const earnerRows: PaycheckRow[] = [
      row({ payDate: new Date("2026-01-15"), paidOut: true, federalWH: baselineFed, stateWH: baselineCa }),
      row({ payDate: new Date("2026-07-01"), paidOut: false, federalWH: baselineFed, stateWH: baselineCa }),
      row({ payDate: new Date("2026-07-15"), paidOut: false, federalWH: baselineFed, stateWH: baselineCa }),
    ];

    const result = computeWhatIf({
      taxYear: 2026,
      earners: [
        {
          earnerId: 1,
          payFrequency: "biweekly",
          paychecks: earnerRows,
          w4Config: w4Low,
          de4Config: de4,
        },
      ],
      taxProfile,
      brokerage,
      targetEarnerId: 1,
      effectiveDate: new Date("2026-07-01"),
      newW4Config: w4WithExtra,
    });

    // Two unpaid checks each get +$200 extra federal withholding -> +$400 total.
    expect(result.delta.federalRefundDelta).toBeCloseTo(400, 2);
    expect(result.delta.caRefundDelta).toBeCloseTo(0, 2);
  });

  it("baseline and what-if are both returned so the UI can diff them", () => {
    const earnerRows: PaycheckRow[] = [row({ payDate: new Date("2026-03-01"), paidOut: false })];
    const result = computeWhatIf({
      taxYear: 2026,
      earners: [
        {
          earnerId: 1,
          payFrequency: "biweekly",
          paychecks: earnerRows,
          w4Config: w4Low,
          de4Config: de4,
        },
      ],
      taxProfile,
      brokerage,
      targetEarnerId: 1,
      effectiveDate: new Date("2026-01-01"),
      newW4Config: w4WithExtra,
    });
    expect(result.baseline.federal.withholding).not.toBe(result.whatIf.federal.withholding);
  });
});

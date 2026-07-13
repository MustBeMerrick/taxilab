import { computeFederalWithholding, type PayFrequency, type W4ConfigInput } from "@/lib/withholding/federal";
import { computeCaWithholding, type DE4ConfigInput } from "@/lib/withholding/california";
import {
  summarizeEarnerPaychecks,
  combineHouseholdPaychecks,
  type PaycheckRow,
} from "@/lib/projection/paychecks";
import { computeSummary, type ComputeSummaryInput, type ComputeSummaryResult } from "@/lib/projection/summary";

/**
 * Recomputes federalWH/stateWH for paycheck rows that are still unpaid and
 * fall on/after `effectiveDate`, using the given W-4/DE-4 configs. Rows that
 * are already paid out, or fall before the effective date, are returned
 * unchanged. This never mutates the input array or touches the database --
 * it's a pure projection overlay.
 */
export function applyWhatIfOverlay(
  rows: PaycheckRow[],
  effectiveDate: Date,
  payFrequency: PayFrequency,
  w4Config: W4ConfigInput,
  de4Config: DE4ConfigInput,
  taxYear: number,
): PaycheckRow[] {
  return rows.map((row) => {
    const isOverlaid = !row.paidOut && row.payDate.getTime() >= effectiveDate.getTime();
    if (!isOverlaid) return row;

    const fed = computeFederalWithholding({
      grossThisCheck: row.gross,
      payFrequency,
      w4Config,
      taxYear,
    });
    const ca = computeCaWithholding({
      grossThisCheck: row.gross,
      payFrequency,
      de4Config,
      taxYear,
    });

    return {
      ...row,
      federalWH: fed.withholding,
      stateWH: ca.withholding,
    };
  });
}

export interface EarnerProjectionInput {
  earnerId: number;
  payFrequency: PayFrequency;
  paychecks: PaycheckRow[];
  w4Config: W4ConfigInput;
  de4Config: DE4ConfigInput;
}

export interface WhatIfOverlayInput {
  taxYear: number;
  earners: EarnerProjectionInput[];
  taxProfile: ComputeSummaryInput["taxProfile"];
  brokerage: ComputeSummaryInput["brokerage"];
  targetEarnerId: number;
  effectiveDate: Date;
  newW4Config?: W4ConfigInput;
  newDe4Config?: DE4ConfigInput;
}

export interface WhatIfResult {
  baseline: ComputeSummaryResult;
  whatIf: ComputeSummaryResult;
  delta: { federalRefundDelta: number; caRefundDelta: number };
}

/**
 * Re-runs summary.ts twice: once for the paycheck log as recorded, and once
 * with the target earner's unpaid future paychecks recomputed under a
 * modified W-4/DE-4 config starting at `effectiveDate`. Returns both so the
 * UI can diff them; never mutates the underlying paycheck rows.
 */
export function computeWhatIf(input: WhatIfOverlayInput): WhatIfResult {
  const baselineEarnerSummaries = input.earners.map((e) =>
    summarizeEarnerPaychecks(e.paychecks, input.taxYear),
  );
  const baselineHousehold = combineHouseholdPaychecks(baselineEarnerSummaries);
  const baseline = computeSummary({
    taxProfile: input.taxProfile,
    household: {
      wages: baselineHousehold.projectedBox1Wages,
      federalWithholding: baselineHousehold.projectedFederalWH,
      stateWithholding: baselineHousehold.projectedStateWH,
    },
    brokerage: input.brokerage,
  });

  const whatIfEarnerSummaries = input.earners.map((e) => {
    if (e.earnerId !== input.targetEarnerId) {
      return summarizeEarnerPaychecks(e.paychecks, input.taxYear);
    }
    const overlaidRows = applyWhatIfOverlay(
      e.paychecks,
      input.effectiveDate,
      e.payFrequency,
      input.newW4Config ?? e.w4Config,
      input.newDe4Config ?? e.de4Config,
      input.taxYear,
    );
    return summarizeEarnerPaychecks(overlaidRows, input.taxYear);
  });
  const whatIfHousehold = combineHouseholdPaychecks(whatIfEarnerSummaries);
  const whatIf = computeSummary({
    taxProfile: input.taxProfile,
    household: {
      wages: whatIfHousehold.projectedBox1Wages,
      federalWithholding: whatIfHousehold.projectedFederalWH,
      stateWithholding: whatIfHousehold.projectedStateWH,
    },
    brokerage: input.brokerage,
  });

  return {
    baseline,
    whatIf,
    delta: {
      federalRefundDelta: round2(whatIf.federal.refundOrOwed - baseline.federal.refundOrOwed),
      caRefundDelta: round2(whatIf.california.refundOrOwed - baseline.california.refundOrOwed),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

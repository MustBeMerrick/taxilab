import { computeFicaForPaycheck } from "@/lib/fica";

export interface PaycheckRow {
  payDate: Date;
  gross: number;
  federalWH: number;
  stateWH: number;
  hsaPreTax: number;
  nonHsaPreTax: number;
  gtli: number;
  paidOut: boolean;
}

export interface PaycheckSummary {
  ytdGross: number;
  ytdBox1Wages: number;
  ytdFederalWH: number;
  ytdStateWH: number;
  ytdOasdi: number;
  ytdMedicare: number;
  ytdCaSdi: number;
  projectedGross: number;
  projectedBox1Wages: number;
  projectedFederalWH: number;
  projectedStateWH: number;
  projectedOasdi: number;
  projectedMedicare: number;
  projectedCaSdi: number;
}

function emptySummary(): PaycheckSummary {
  return {
    ytdGross: 0,
    ytdBox1Wages: 0,
    ytdFederalWH: 0,
    ytdStateWH: 0,
    ytdOasdi: 0,
    ytdMedicare: 0,
    ytdCaSdi: 0,
    projectedGross: 0,
    projectedBox1Wages: 0,
    projectedFederalWH: 0,
    projectedStateWH: 0,
    projectedOasdi: 0,
    projectedMedicare: 0,
    projectedCaSdi: 0,
  };
}

/** W-2 Box 1 wages: gross minus employee pre-tax deductions (HSA, 401k/other), plus imputed GTLI income. */
function box1Wages(row: PaycheckRow): number {
  return row.gross - row.hsaPreTax - row.nonHsaPreTax + row.gtli;
}

/**
 * Sums one earner's paycheck rows into YTD (paidOut=true) and Projected
 * (all rows) totals. FICA/SDI are recomputed here via lib/fica, applied
 * per paycheck in chronological order, so a mid-year wage-base crossing is
 * handled correctly rather than by capping a naive row-sum after the fact.
 * FICA/SDI are computed on gross wages (pre-tax deductions like HSA/401k
 * generally still reduce FICA wages too, but this app tracks the values
 * the employer actually reported per paycheck rather than re-deriving them).
 */
export function summarizeEarnerPaychecks(rows: PaycheckRow[], taxYear: number): PaycheckSummary {
  const sorted = [...rows].sort((a, b) => a.payDate.getTime() - b.payDate.getTime());
  const summary = emptySummary();

  let cumulativeWages = 0;
  for (const row of sorted) {
    const fica = computeFicaForPaycheck({
      grossThisCheck: row.gross,
      cumulativeWagesBeforeThisCheck: cumulativeWages,
      taxYear,
    });
    cumulativeWages += row.gross;
    const wages = box1Wages(row);

    summary.projectedGross += row.gross;
    summary.projectedBox1Wages += wages;
    summary.projectedFederalWH += row.federalWH;
    summary.projectedStateWH += row.stateWH;
    summary.projectedOasdi += fica.oasdi;
    summary.projectedMedicare += fica.medicare;
    summary.projectedCaSdi += fica.caSdi;

    if (row.paidOut) {
      summary.ytdGross += row.gross;
      summary.ytdBox1Wages += wages;
      summary.ytdFederalWH += row.federalWH;
      summary.ytdStateWH += row.stateWH;
      summary.ytdOasdi += fica.oasdi;
      summary.ytdMedicare += fica.medicare;
      summary.ytdCaSdi += fica.caSdi;
    }
  }

  return roundSummary(summary);
}

/** Household totals = sum of independently FICA/SDI-capped per-earner summaries. */
export function combineHouseholdPaychecks(earnerSummaries: PaycheckSummary[]): PaycheckSummary {
  const total = emptySummary();
  for (const s of earnerSummaries) {
    total.ytdGross += s.ytdGross;
    total.ytdBox1Wages += s.ytdBox1Wages;
    total.ytdFederalWH += s.ytdFederalWH;
    total.ytdStateWH += s.ytdStateWH;
    total.ytdOasdi += s.ytdOasdi;
    total.ytdMedicare += s.ytdMedicare;
    total.ytdCaSdi += s.ytdCaSdi;
    total.projectedGross += s.projectedGross;
    total.projectedBox1Wages += s.projectedBox1Wages;
    total.projectedFederalWH += s.projectedFederalWH;
    total.projectedStateWH += s.projectedStateWH;
    total.projectedOasdi += s.projectedOasdi;
    total.projectedMedicare += s.projectedMedicare;
    total.projectedCaSdi += s.projectedCaSdi;
  }
  return roundSummary(total);
}

function roundSummary(s: PaycheckSummary): PaycheckSummary {
  const out = {} as PaycheckSummary;
  for (const key of Object.keys(s) as (keyof PaycheckSummary)[]) {
    out[key] = Math.round(s[key] * 100) / 100;
  }
  return out;
}

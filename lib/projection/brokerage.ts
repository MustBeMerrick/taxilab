export type EstimateMode = "manual" | "ytd-extrapolate";

export interface IncomeLineEstimate {
  mode: EstimateMode;
  annual: number | null;
  ytd: number | null;
  asOf: Date | null;
}

export interface BrokerageEstimateInput {
  stGains: IncomeLineEstimate;
  ltGains: IncomeLineEstimate;
  qualifiedDiv: IncomeLineEstimate;
  ordinaryDiv: IncomeLineEstimate;
  interest: IncomeLineEstimate;
}

export interface ResolvedBrokerageIncome {
  stGains: number;
  ltGains: number;
  qualifiedDiv: number;
  ordinaryDiv: number;
  interest: number;
}

/** Resolves a single manual/YTD-extrapolate income line into a projected annual figure. */
export function resolveIncomeLine(line: IncomeLineEstimate, taxYear: number): number {
  if (line.mode === "manual") {
    return line.annual ?? 0;
  }

  if (!line.ytd || !line.asOf) return 0;

  const yearStart = Date.UTC(taxYear, 0, 1);
  const yearEnd = Date.UTC(taxYear, 11, 31);
  const asOfMs = line.asOf.getTime();
  const elapsedFraction = Math.min(
    1,
    Math.max(0, (asOfMs - yearStart) / (yearEnd - yearStart)),
  );

  // Guard against dividing by ~0 fraction (as-of date at/near Jan 1).
  const MIN_FRACTION = 1 / 365;
  const safeFraction = Math.max(elapsedFraction, MIN_FRACTION);
  return line.ytd / safeFraction;
}

export function resolveBrokerageEstimate(
  estimate: BrokerageEstimateInput,
  taxYear: number,
): ResolvedBrokerageIncome {
  return {
    stGains: resolveIncomeLine(estimate.stGains, taxYear),
    ltGains: resolveIncomeLine(estimate.ltGains, taxYear),
    qualifiedDiv: resolveIncomeLine(estimate.qualifiedDiv, taxYear),
    ordinaryDiv: resolveIncomeLine(estimate.ordinaryDiv, taxYear),
    interest: resolveIncomeLine(estimate.interest, taxYear),
  };
}

export function aggregateBrokerageIncome(
  resolved: ResolvedBrokerageIncome[],
): ResolvedBrokerageIncome {
  return resolved.reduce(
    (acc, r) => ({
      stGains: acc.stGains + r.stGains,
      ltGains: acc.ltGains + r.ltGains,
      qualifiedDiv: acc.qualifiedDiv + r.qualifiedDiv,
      ordinaryDiv: acc.ordinaryDiv + r.ordinaryDiv,
      interest: acc.interest + r.interest,
    }),
    { stGains: 0, ltGains: 0, qualifiedDiv: 0, ordinaryDiv: 0, interest: 0 },
  );
}

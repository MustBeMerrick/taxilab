import { getFed1040Brackets, findBracket, type Bracket } from "@/lib/tax-data";

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh";

export interface ComputeFederalLiabilityInput {
  taxYear: number;
  filingStatus: FilingStatus;
  wages: number;
  ordinaryDividends: number;
  qualifiedDividends: number;
  interest: number;
  shortTermGains: number;
  longTermGains: number;
  otherIncome: number;
  deductionAmount: number;
  dependents: number;
}

export interface ComputeFederalLiabilityResult {
  totalIncome: number;
  taxableIncome: number;
  ordinaryTaxableIncome: number;
  preferentialIncome: number;
  ordinaryTax: number;
  ltcgTax: number;
  niit: number;
  addlMedicare: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

function taxForBracket(amount: number, brackets: Bracket[]) {
  const bracket = findBracket(brackets, amount);
  return bracket.base + (amount - bracket.atLeast) * bracket.rate;
}

/**
 * 1040 annual liability: ordinary tax + LTCG/qualified-dividend stacking +
 * NIIT + Additional Medicare Tax. CTC/other credits are out of scope for a
 * projection tool -- `dependents` is accepted for future use but does not
 * currently reduce ordinaryTax (no credit table sourced for this build).
 */
export function computeFederalLiability({
  taxYear,
  filingStatus,
  wages,
  ordinaryDividends,
  qualifiedDividends,
  interest,
  shortTermGains,
  longTermGains,
  otherIncome,
  deductionAmount,
}: ComputeFederalLiabilityInput): ComputeFederalLiabilityResult {
  const data = getFed1040Brackets(taxYear);

  const ordinaryIncome = wages + interest + ordinaryDividends + shortTermGains + otherIncome;
  const preferentialIncome = qualifiedDividends + longTermGains;
  const totalIncome = ordinaryIncome + preferentialIncome;
  const taxableIncome = Math.max(0, totalIncome - deductionAmount);

  // Deduction applied against ordinary income first (Qualified Div & Cap Gain worksheet).
  const ordinaryTaxableIncome = Math.max(0, Math.min(taxableIncome, ordinaryIncome - deductionAmount));
  const preferentialTaxableIncome = taxableIncome - ordinaryTaxableIncome;

  const ordinaryBrackets = data.ordinaryBrackets[filingStatus];
  const ordinaryTax = taxForBracket(ordinaryTaxableIncome, ordinaryBrackets);

  const ltcg = data.ltcgBrackets[filingStatus];
  const zeroCeiling = Math.max(ordinaryTaxableIncome, Math.min(taxableIncome, ltcg.zeroRateMax));
  const fifteenCeiling = Math.max(
    ordinaryTaxableIncome,
    Math.min(taxableIncome, ltcg.fifteenRateMax),
  );
  const amountAtZero = Math.max(0, zeroCeiling - ordinaryTaxableIncome);
  const amountAtFifteen = Math.max(0, fifteenCeiling - zeroCeiling);
  const amountAtTwenty = Math.max(0, taxableIncome - fifteenCeiling);
  const ltcgTax = amountAtZero * 0 + amountAtFifteen * 0.15 + amountAtTwenty * 0.2;

  const netInvestmentIncome = Math.max(
    0,
    interest + ordinaryDividends + qualifiedDividends + shortTermGains + longTermGains,
  );
  const magi = totalIncome;
  const niitThreshold = data.niit.magiThreshold[filingStatus];
  const niitBase = Math.max(0, Math.min(netInvestmentIncome, magi - niitThreshold));
  const niit = niitBase * data.niit.rate;

  const addlMedicareThreshold = data.additionalMedicare.wageThreshold[filingStatus];
  const addlMedicare = Math.max(0, wages - addlMedicareThreshold) * data.additionalMedicare.rate;

  const totalTax = ordinaryTax + ltcgTax + niit + addlMedicare;
  const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;
  const marginalBracket = findBracket(ordinaryBrackets, ordinaryTaxableIncome);

  return {
    totalIncome,
    taxableIncome,
    ordinaryTaxableIncome,
    preferentialIncome: preferentialTaxableIncome,
    ordinaryTax: round2(ordinaryTax),
    ltcgTax: round2(ltcgTax),
    niit: round2(niit),
    addlMedicare: round2(addlMedicare),
    totalTax: round2(totalTax),
    effectiveRate,
    marginalRate: marginalBracket.rate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

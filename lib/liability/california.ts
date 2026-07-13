import { getCa540Brackets, findBracket } from "@/lib/tax-data";
import type { FilingStatus } from "@/lib/liability/federal";

export interface ComputeCaLiabilityInput {
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

export interface ComputeCaLiabilityResult {
  totalIncome: number;
  taxableIncome: number;
  ordinaryTax: number;
  mentalHealthServicesTax: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
}

/**
 * CA 540 annual liability. CA taxes all capital gains and dividends as
 * ordinary income (no preferential rate) and has no NIIT / Additional
 * Medicare equivalent. Adds the 1% Mental Health Services Tax on taxable
 * income over $1,000,000 (not doubled for MFJ).
 */
export function computeCaLiability({
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
  dependents,
}: ComputeCaLiabilityInput): ComputeCaLiabilityResult {
  const data = getCa540Brackets(taxYear);

  const totalIncome =
    wages +
    ordinaryDividends +
    qualifiedDividends +
    interest +
    shortTermGains +
    longTermGains +
    otherIncome;
  const taxableIncome = Math.max(0, totalIncome - deductionAmount);

  const brackets = data.ordinaryBrackets[filingStatus];
  const bracket = findBracket(brackets, taxableIncome);
  const grossTax = bracket.base + (taxableIncome - bracket.atLeast) * bracket.rate;

  const filersCount = filingStatus === "mfj" ? 2 : 1;
  const exemptionCredit =
    filersCount * data.personalExemptionCreditPerFiler +
    dependents * data.dependentExemptionCreditPerDependent;
  const ordinaryTax = Math.max(0, grossTax - exemptionCredit);

  const mhst = data.mentalHealthServicesTax;
  const mentalHealthServicesTax = Math.max(0, taxableIncome - mhst.threshold) * mhst.rate;

  const totalTax = ordinaryTax + mentalHealthServicesTax;
  const effectiveRate = totalIncome > 0 ? totalTax / totalIncome : 0;

  return {
    totalIncome,
    taxableIncome,
    ordinaryTax: round2(ordinaryTax),
    mentalHealthServicesTax: round2(mentalHealthServicesTax),
    totalTax: round2(totalTax),
    effectiveRate,
    marginalRate: bracket.rate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

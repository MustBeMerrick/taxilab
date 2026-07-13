import { getFedPercentageMethod, findBracket, type Bracket } from "@/lib/tax-data";

export type PayFrequency = "weekly" | "biweekly" | "semimonthly" | "monthly";

export interface W4ConfigInput {
  filingStatusOnW4: "single" | "mfj" | "hoh";
  multipleJobsChecked: boolean;
  dependentsCredit: number;
  otherIncome: number;
  deductionsAdj: number;
  extraWithholding: number;
  payFrequency: PayFrequency;
}

export interface ComputeFederalWithholdingInput {
  grossThisCheck: number;
  payFrequency: PayFrequency;
  w4Config: W4ConfigInput;
  taxYear: number;
}

export interface ComputeFederalWithholdingResult {
  withholding: number;
  breakdown: {
    payPeriodsPerYear: number;
    annualizedWages: number;
    adjustedAnnualWageAmount: number;
    tentativeAnnualWithholding: number;
    annualDependentsCreditApplied: number;
    tentativeWithholdingAfterCredits: number;
    perPeriodWithholdingBeforeExtra: number;
    extraWithholding: number;
    bracketUsed: Bracket;
  };
}

function tableKeyForFilingStatus(status: "single" | "mfj" | "hoh"): "mfj" | "single_mfs" | "hoh" {
  if (status === "mfj") return "mfj";
  if (status === "hoh") return "hoh";
  return "single_mfs";
}

/**
 * Pub 15-T Worksheet 1A: Employer's Withholding Worksheet for Percentage
 * Method Tables for Automated Payroll Systems (2020+ Form W-4).
 */
export function computeFederalWithholding({
  grossThisCheck,
  payFrequency,
  w4Config,
  taxYear,
}: ComputeFederalWithholdingInput): ComputeFederalWithholdingResult {
  const data = getFedPercentageMethod(taxYear);
  const payPeriodsPerYear = data.payFrequencies[payFrequency];
  if (!payPeriodsPerYear) {
    throw new Error(`Unknown pay frequency: ${payFrequency}`);
  }

  // Step 1: Adjust the employee's payment amount.
  const annualizedWages = grossThisCheck * payPeriodsPerYear;
  const step1e = annualizedWages + w4Config.otherIncome; // 1d + 1c
  const step1g = w4Config.multipleJobsChecked
    ? data.step1g.boxCheckedAmount
    : w4Config.filingStatusOnW4 === "mfj"
      ? data.step1g.boxNotCheckedMfj
      : data.step1g.boxNotCheckedOther;
  const step1h = w4Config.deductionsAdj + step1g; // 1f + 1g
  const adjustedAnnualWageAmount = Math.max(0, step1e - step1h);

  // Step 2: Figure the Tentative Withholding Amount.
  const tableKey = tableKeyForFilingStatus(w4Config.filingStatusOnW4);
  const table = w4Config.multipleJobsChecked ? data.tables.checkbox : data.tables.standard;
  const bracket = findBracket(table[tableKey], adjustedAnnualWageAmount);
  const excessOver = bracket.excessOver ?? bracket.atLeast;
  const tentativeAnnualWithholding =
    bracket.base + (adjustedAnnualWageAmount - excessOver) * bracket.rate;

  // Step 3: Account for tax credits (Step 3 of Form W-4, annual dependents credit).
  const tentativeWithholdingAfterCredits = Math.max(
    0,
    tentativeAnnualWithholding - w4Config.dependentsCredit,
  );
  const perPeriodWithholdingBeforeExtra = tentativeWithholdingAfterCredits / payPeriodsPerYear;

  // Step 4: Add Step 4(c) extra withholding.
  const withholding = perPeriodWithholdingBeforeExtra + w4Config.extraWithholding;

  return {
    withholding: Math.round(withholding * 100) / 100,
    breakdown: {
      payPeriodsPerYear,
      annualizedWages,
      adjustedAnnualWageAmount,
      tentativeAnnualWithholding,
      annualDependentsCreditApplied: w4Config.dependentsCredit,
      tentativeWithholdingAfterCredits,
      perPeriodWithholdingBeforeExtra,
      extraWithholding: w4Config.extraWithholding,
      bracketUsed: bracket,
    },
  };
}

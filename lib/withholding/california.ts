import { getCaDe44, findBracket, type Bracket } from "@/lib/tax-data";
import type { PayFrequency } from "@/lib/withholding/federal";

export interface DE4ConfigInput {
  filingStatus: "single" | "mfj-one-income" | "mfj-two-incomes" | "hoh";
  regularAllowances: number;
  estimatedDeductions: number;
  additionalWithholding: number;
  payFrequency: PayFrequency;
}

export interface ComputeCaWithholdingInput {
  grossThisCheck: number;
  payFrequency: PayFrequency;
  de4Config: DE4ConfigInput;
  taxYear: number;
}

export interface ComputeCaWithholdingResult {
  withholding: number;
  breakdown: {
    payPeriodsPerYear: number;
    annualizedWages: number;
    lowIncomeExempt: boolean;
    lowIncomeExemptionThreshold: number;
    afterEstimatedDeductions: number;
    afterStandardDeduction: number;
    computedAnnualTax: number;
    exemptionAllowanceCredit: number;
    netAnnualTax: number;
    perPeriodWithholdingBeforeAdditional: number;
    additionalWithholding: number;
    bracketUsed: Bracket;
  };
}

/** Which DE-44 table column applies for a given DE-4 filing status + allowance count. */
function tableColumn(
  filingStatus: DE4ConfigInput["filingStatus"],
  regularAllowances: number,
): { lowIncomeKey: string; stdDeductionKey: string; rateTableKey: "single" | "married" | "hoh" } {
  if (filingStatus === "hoh") {
    return { lowIncomeKey: "hoh", stdDeductionKey: "hoh", rateTableKey: "hoh" };
  }
  if (filingStatus === "mfj-two-incomes") {
    // EDD recommends dual-income married employees use the Single column/table.
    return { lowIncomeKey: "single", stdDeductionKey: "single", rateTableKey: "single" };
  }
  if (filingStatus === "mfj-one-income") {
    const bucket = regularAllowances >= 2 ? "married_2plus" : "married_0_1";
    return { lowIncomeKey: bucket, stdDeductionKey: bucket, rateTableKey: "married" };
  }
  return { lowIncomeKey: "single", stdDeductionKey: "single", rateTableKey: "single" };
}

/**
 * CA EDD DE-44 Method B - Exact Calculation Method.
 * Uses the annualize-then-divide variant EDD documents as an accepted
 * alternative to using 24 separate period-specific tax rate tables.
 */
export function computeCaWithholding({
  grossThisCheck,
  payFrequency,
  de4Config,
  taxYear,
}: ComputeCaWithholdingInput): ComputeCaWithholdingResult {
  const data = getCaDe44(taxYear);
  const payPeriodsPerYear = data.payFrequencies[payFrequency];
  if (!payPeriodsPerYear) {
    throw new Error(`Unknown pay frequency: ${payFrequency}`);
  }

  const cols = tableColumn(de4Config.filingStatus, de4Config.regularAllowances);
  const annualizedWages = grossThisCheck * payPeriodsPerYear;

  // Step 1: Low Income Exemption check.
  const lowIncomeExemptionThreshold = data.lowIncomeExemptionAnnual[cols.lowIncomeKey];
  const lowIncomeExempt = annualizedWages <= lowIncomeExemptionThreshold;

  if (lowIncomeExempt) {
    return {
      withholding: Math.max(0, de4Config.additionalWithholding),
      breakdown: {
        payPeriodsPerYear,
        annualizedWages,
        lowIncomeExempt: true,
        lowIncomeExemptionThreshold,
        afterEstimatedDeductions: annualizedWages,
        afterStandardDeduction: 0,
        computedAnnualTax: 0,
        exemptionAllowanceCredit: 0,
        netAnnualTax: 0,
        perPeriodWithholdingBeforeAdditional: 0,
        additionalWithholding: de4Config.additionalWithholding,
        bracketUsed: { atLeast: 0, lessThan: null, base: 0, rate: 0 },
      },
    };
  }

  // Step 2: Subtract estimated deductions (annualized).
  const estimatedDeductionAmount =
    de4Config.estimatedDeductions * data.estimatedDeductionPerAllowanceAnnual;
  const afterEstimatedDeductions = annualizedWages - estimatedDeductionAmount;

  // Step 3: Subtract standard deduction.
  const standardDeduction = data.standardDeductionAnnual[cols.stdDeductionKey];
  const afterStandardDeduction = Math.max(0, afterEstimatedDeductions - standardDeduction);

  // Step 4: Tax computation from the annual tax rate table.
  const bracket = findBracket(data.annualTaxRateTables[cols.rateTableKey], afterStandardDeduction);
  const computedAnnualTax = bracket.base + (afterStandardDeduction - bracket.atLeast) * bracket.rate;

  // Step 5: Subtract exemption allowance credit.
  const exemptionAllowanceCredit =
    de4Config.regularAllowances * data.exemptionAllowancePerAllowanceAnnual;
  const netAnnualTax = Math.max(0, computedAnnualTax - exemptionAllowanceCredit);

  const perPeriodWithholdingBeforeAdditional = netAnnualTax / payPeriodsPerYear;
  const withholding = perPeriodWithholdingBeforeAdditional + de4Config.additionalWithholding;

  return {
    withholding: Math.round(withholding * 100) / 100,
    breakdown: {
      payPeriodsPerYear,
      annualizedWages,
      lowIncomeExempt: false,
      lowIncomeExemptionThreshold,
      afterEstimatedDeductions,
      afterStandardDeduction,
      computedAnnualTax,
      exemptionAllowanceCredit,
      netAnnualTax,
      perPeriodWithholdingBeforeAdditional,
      additionalWithholding: de4Config.additionalWithholding,
      bracketUsed: bracket,
    },
  };
}

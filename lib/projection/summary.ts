import { computeFederalLiability, type FilingStatus } from "@/lib/liability/federal";
import { computeCaLiability } from "@/lib/liability/california";
import { getFed1040Brackets, getCa540Brackets } from "@/lib/tax-data";
import type { ResolvedBrokerageIncome } from "@/lib/projection/brokerage";

export interface TaxProfileInput {
  taxYear: number;
  filingStatus: FilingStatus;
  dependents: number;
  useItemized: boolean;
  itemizedFederal: number;
  itemizedCA: number;
  otherJointIncome: number;
}

export interface HouseholdWagesInput {
  wages: number; // Box 1 equivalent, summed across earners
  federalWithholding: number;
  stateWithholding: number;
}

export interface ComputeSummaryInput {
  taxProfile: TaxProfileInput;
  household: HouseholdWagesInput;
  brokerage: ResolvedBrokerageIncome;
}

export interface WaterfallSide {
  wages: number;
  interest: number;
  ordinaryDividends: number;
  qualifiedDividends: number;
  shortTermGains: number;
  longTermGains: number;
  otherIncome: number;
  totalIncome: number;
  deduction: number;
  taxableIncome: number;
  ordinaryTax: number;
  extraTax: number; // ltcgTax+niit+addlMedicare (federal) or MHST (CA)
  extraTaxBreakdown: Record<string, number>;
  totalTax: number;
  withholding: number;
  refundOrOwed: number; // positive = refund, negative = owed
}

export interface ComputeSummaryResult {
  federal: WaterfallSide;
  california: WaterfallSide;
}

export function computeSummary({
  taxProfile,
  household,
  brokerage,
}: ComputeSummaryInput): ComputeSummaryResult {
  const fedBracketData = getFed1040Brackets(taxProfile.taxYear);
  const caBracketData = getCa540Brackets(taxProfile.taxYear);

  const federalDeduction = taxProfile.useItemized
    ? taxProfile.itemizedFederal
    : fedBracketData.standardDeduction[taxProfile.filingStatus];
  const caDeduction = taxProfile.useItemized
    ? taxProfile.itemizedCA
    : caBracketData.standardDeduction[taxProfile.filingStatus];

  const federalLiability = computeFederalLiability({
    taxYear: taxProfile.taxYear,
    filingStatus: taxProfile.filingStatus,
    wages: household.wages,
    interest: brokerage.interest,
    ordinaryDividends: brokerage.ordinaryDiv,
    qualifiedDividends: brokerage.qualifiedDiv,
    shortTermGains: brokerage.stGains,
    longTermGains: brokerage.ltGains,
    otherIncome: taxProfile.otherJointIncome,
    deductionAmount: federalDeduction,
    dependents: taxProfile.dependents,
  });

  const caLiability = computeCaLiability({
    taxYear: taxProfile.taxYear,
    filingStatus: taxProfile.filingStatus,
    wages: household.wages,
    interest: brokerage.interest,
    ordinaryDividends: brokerage.ordinaryDiv,
    qualifiedDividends: brokerage.qualifiedDiv,
    shortTermGains: brokerage.stGains,
    longTermGains: brokerage.ltGains,
    otherIncome: taxProfile.otherJointIncome,
    deductionAmount: caDeduction,
    dependents: taxProfile.dependents,
  });

  const federal: WaterfallSide = {
    wages: household.wages,
    interest: brokerage.interest,
    ordinaryDividends: brokerage.ordinaryDiv,
    qualifiedDividends: brokerage.qualifiedDiv,
    shortTermGains: brokerage.stGains,
    longTermGains: brokerage.ltGains,
    otherIncome: taxProfile.otherJointIncome,
    totalIncome: federalLiability.totalIncome,
    deduction: federalDeduction,
    taxableIncome: federalLiability.taxableIncome,
    ordinaryTax: federalLiability.ordinaryTax,
    extraTax: round2(federalLiability.ltcgTax + federalLiability.niit + federalLiability.addlMedicare),
    extraTaxBreakdown: {
      ltcgTax: federalLiability.ltcgTax,
      niit: federalLiability.niit,
      addlMedicare: federalLiability.addlMedicare,
    },
    totalTax: federalLiability.totalTax,
    withholding: household.federalWithholding,
    refundOrOwed: round2(household.federalWithholding - federalLiability.totalTax),
  };

  const california: WaterfallSide = {
    wages: household.wages,
    interest: brokerage.interest,
    ordinaryDividends: brokerage.ordinaryDiv,
    qualifiedDividends: brokerage.qualifiedDiv,
    shortTermGains: brokerage.stGains,
    longTermGains: brokerage.ltGains,
    otherIncome: taxProfile.otherJointIncome,
    totalIncome: caLiability.totalIncome,
    deduction: caDeduction,
    taxableIncome: caLiability.taxableIncome,
    ordinaryTax: caLiability.ordinaryTax,
    extraTax: caLiability.mentalHealthServicesTax,
    extraTaxBreakdown: {
      mentalHealthServicesTax: caLiability.mentalHealthServicesTax,
    },
    totalTax: caLiability.totalTax,
    withholding: household.stateWithholding,
    refundOrOwed: round2(household.stateWithholding - caLiability.totalTax),
  };

  return { federal, california };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

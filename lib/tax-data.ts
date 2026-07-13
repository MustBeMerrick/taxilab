import fs from "node:fs";
import path from "node:path";

const cache = new Map<string, unknown>();

function loadTaxDataFile<T>(taxYear: number, fileName: string): T {
  const key = `${taxYear}/${fileName}`;
  const cached = cache.get(key);
  if (cached) return cached as T;

  const filePath = path.join(process.cwd(), "tax-data", String(taxYear), fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as T;
  cache.set(key, data);
  return data;
}

export interface Bracket {
  atLeast: number;
  lessThan: number | null;
  base: number;
  rate: number;
  excessOver?: number;
}

export interface FedPercentageMethodData {
  taxYear: number;
  payFrequencies: Record<string, number>;
  step1g: {
    boxCheckedAmount: number;
    boxNotCheckedMfj: number;
    boxNotCheckedOther: number;
  };
  tables: {
    standard: { mfj: Bracket[]; single_mfs: Bracket[]; hoh: Bracket[] };
    checkbox: { mfj: Bracket[]; single_mfs: Bracket[]; hoh: Bracket[] };
  };
}

export interface Fed1040BracketsData {
  taxYear: number;
  standardDeduction: Record<string, number>;
  ordinaryBrackets: Record<string, Bracket[]>;
  ltcgBrackets: Record<string, { zeroRateMax: number; fifteenRateMax: number }>;
  niit: { rate: number; magiThreshold: Record<string, number> };
  additionalMedicare: { rate: number; wageThreshold: Record<string, number> };
}

export interface FedFicaData {
  taxYear: number;
  oasdi: { wageBase: number; employeeRate: number };
  medicare: { employeeRate: number; wageBase: number | null };
}

export interface CaDe44Data {
  taxYear: number;
  payFrequencies: Record<string, number>;
  lowIncomeExemptionAnnual: Record<string, number>;
  standardDeductionAnnual: Record<string, number>;
  estimatedDeductionPerAllowanceAnnual: number;
  exemptionAllowancePerAllowanceAnnual: number;
  annualTaxRateTables: Record<string, Bracket[]>;
}

export interface Ca540BracketsData {
  taxYear: number;
  standardDeduction: Record<string, number>;
  personalExemptionCreditPerFiler: number;
  dependentExemptionCreditPerDependent: number;
  ordinaryBrackets: Record<string, Bracket[]>;
  mentalHealthServicesTax: { rate: number; threshold: number };
}

export interface CaSdiData {
  taxYear: number;
  rate: number;
  wageBase: number | null;
}

export function getFedPercentageMethod(taxYear: number): FedPercentageMethodData {
  return loadTaxDataFile(taxYear, "fed-percentage-method.json");
}

export function getFed1040Brackets(taxYear: number): Fed1040BracketsData {
  return loadTaxDataFile(taxYear, "fed-1040-brackets.json");
}

export function getFedFica(taxYear: number): FedFicaData {
  return loadTaxDataFile(taxYear, "fed-fica.json");
}

export function getCaDe44(taxYear: number): CaDe44Data {
  return loadTaxDataFile(taxYear, "ca-de44.json");
}

export function getCa540Brackets(taxYear: number): Ca540BracketsData {
  return loadTaxDataFile(taxYear, "ca-540-brackets.json");
}

export function getCaSdi(taxYear: number): CaSdiData {
  return loadTaxDataFile(taxYear, "ca-sdi.json");
}

/** Find the bracket row whose [atLeast, lessThan) range contains `amount`. */
export function findBracket(brackets: Bracket[], amount: number): Bracket {
  for (const b of brackets) {
    if (amount >= b.atLeast && (b.lessThan === null || amount < b.lessThan)) {
      return b;
    }
  }
  return brackets[brackets.length - 1];
}

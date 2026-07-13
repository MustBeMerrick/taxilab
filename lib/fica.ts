import { getFedFica, getCaSdi } from "@/lib/tax-data";

export interface FicaForPaycheckInput {
  grossThisCheck: number;
  cumulativeWagesBeforeThisCheck: number;
  taxYear: number;
}

export interface FicaForPaycheckResult {
  oasdi: number;
  medicare: number;
  caSdi: number;
}

/**
 * Given cumulative wages already paid this year (before this check) and this
 * check's gross, returns how much of THIS check is subject to OASDI/SDI,
 * correctly handling a paycheck that crosses the wage base mid-check.
 */
export function computeFicaForPaycheck({
  grossThisCheck,
  cumulativeWagesBeforeThisCheck,
  taxYear,
}: FicaForPaycheckInput): FicaForPaycheckResult {
  const fica = getFedFica(taxYear);
  const sdi = getCaSdi(taxYear);

  const oasdiWageBase = fica.oasdi.wageBase;
  const remainingOasdiRoom = Math.max(0, oasdiWageBase - cumulativeWagesBeforeThisCheck);
  const oasdiTaxableThisCheck = Math.min(grossThisCheck, remainingOasdiRoom);
  const oasdi = oasdiTaxableThisCheck * fica.oasdi.employeeRate;

  const medicare = grossThisCheck * fica.medicare.employeeRate;

  let caSdiTaxableThisCheck = grossThisCheck;
  if (sdi.wageBase !== null) {
    const remainingSdiRoom = Math.max(0, sdi.wageBase - cumulativeWagesBeforeThisCheck);
    caSdiTaxableThisCheck = Math.min(grossThisCheck, remainingSdiRoom);
  }
  const caSdi = caSdiTaxableThisCheck * sdi.rate;

  return {
    oasdi: Math.round(oasdi * 100) / 100,
    medicare: Math.round(medicare * 100) / 100,
    caSdi: Math.round(caSdi * 100) / 100,
  };
}

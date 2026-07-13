import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveBrokerageEstimate, aggregateBrokerageIncome } from "@/lib/projection/brokerage";
import { computeWhatIf } from "@/lib/projection/what-if";
import type { FilingStatus } from "@/lib/liability/federal";
import type { PayFrequency } from "@/lib/withholding/federal";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const year = Number(body.year);
  const targetEarnerId = Number(body.targetEarnerId);
  const effectiveDate = new Date(body.effectiveDate);

  const [taxProfile, earners, brokerageEstimates] = await Promise.all([
    prisma.taxProfile.findUnique({ where: { year } }),
    prisma.earner.findMany({ include: { paychecks: true, w4Config: true, de4Config: true } }),
    prisma.brokerageEstimate.findMany({ where: { year } }),
  ]);

  if (!taxProfile) {
    return NextResponse.json(
      { error: `No TaxProfile configured for year ${year}. Set one up in Settings.` },
      { status: 400 },
    );
  }

  const missingConfig = earners.find((e) => !e.w4Config || !e.de4Config);
  if (missingConfig) {
    return NextResponse.json(
      { error: `Earner "${missingConfig.name}" is missing a W-4 or DE-4 config.` },
      { status: 400 },
    );
  }

  const resolved = brokerageEstimates.map((est) =>
    resolveBrokerageEstimate(
      {
        stGains: { mode: est.stGainsMode as "manual" | "ytd-extrapolate", annual: est.stGainsAnnual, ytd: est.stGainsYtd, asOf: est.stGainsAsOf },
        ltGains: { mode: est.ltGainsMode as "manual" | "ytd-extrapolate", annual: est.ltGainsAnnual, ytd: est.ltGainsYtd, asOf: est.ltGainsAsOf },
        qualifiedDiv: { mode: est.qualifiedDivMode as "manual" | "ytd-extrapolate", annual: est.qualifiedDivAnnual, ytd: est.qualifiedDivYtd, asOf: est.qualifiedDivAsOf },
        ordinaryDiv: { mode: est.ordinaryDivMode as "manual" | "ytd-extrapolate", annual: est.ordinaryDivAnnual, ytd: est.ordinaryDivYtd, asOf: est.ordinaryDivAsOf },
        interest: { mode: est.interestMode as "manual" | "ytd-extrapolate", annual: est.interestAnnual, ytd: est.interestYtd, asOf: est.interestAsOf },
      },
      year,
    ),
  );
  const brokerage = aggregateBrokerageIncome(resolved);

  const result = computeWhatIf({
    taxYear: year,
    earners: earners.map((e) => ({
      earnerId: e.id,
      payFrequency: e.w4Config!.payFrequency as PayFrequency,
      paychecks: e.paychecks,
      w4Config: {
        filingStatusOnW4: e.w4Config!.filingStatusOnW4 as "single" | "mfj" | "hoh",
        multipleJobsChecked: e.w4Config!.multipleJobsChecked,
        dependentsCredit: e.w4Config!.dependentsCredit,
        otherIncome: e.w4Config!.otherIncome,
        deductionsAdj: e.w4Config!.deductionsAdj,
        extraWithholding: e.w4Config!.extraWithholding,
        payFrequency: e.w4Config!.payFrequency as PayFrequency,
      },
      de4Config: {
        filingStatus: e.de4Config!.filingStatus as "single" | "mfj-one-income" | "mfj-two-incomes" | "hoh",
        regularAllowances: e.de4Config!.regularAllowances,
        estimatedDeductions: e.de4Config!.estimatedDeductions,
        additionalWithholding: e.de4Config!.additionalWithholding,
        payFrequency: e.de4Config!.payFrequency as PayFrequency,
      },
    })),
    taxProfile: {
      taxYear: year,
      filingStatus: taxProfile.filingStatus as FilingStatus,
      dependents: taxProfile.dependents,
      useItemized: taxProfile.useItemized,
      itemizedFederal: taxProfile.itemizedFederal,
      itemizedCA: taxProfile.itemizedCA,
      otherJointIncome: taxProfile.otherJointIncome,
    },
    brokerage,
    targetEarnerId,
    effectiveDate,
    newW4Config: body.newW4Config,
    newDe4Config: body.newDe4Config,
  });

  return NextResponse.json(result);
}

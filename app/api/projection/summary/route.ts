import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { summarizeEarnerPaychecks, combineHouseholdPaychecks } from "@/lib/projection/paychecks";
import { resolveBrokerageEstimate, aggregateBrokerageIncome } from "@/lib/projection/brokerage";
import { computeSummary } from "@/lib/projection/summary";
import type { FilingStatus } from "@/lib/liability/federal";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear());

  const [taxProfile, earners, brokerageEstimates] = await Promise.all([
    prisma.taxProfile.findUnique({ where: { year } }),
    prisma.earner.findMany({ include: { paychecks: true } }),
    prisma.brokerageEstimate.findMany({ where: { year } }),
  ]);

  if (!taxProfile) {
    return NextResponse.json(
      { error: `No TaxProfile configured for year ${year}. Set one up in Settings.` },
      { status: 400 },
    );
  }

  const earnerSummaries = earners.map((e) => summarizeEarnerPaychecks(e.paychecks, year));
  const household = combineHouseholdPaychecks(earnerSummaries);

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

  const result = computeSummary({
    taxProfile: {
      taxYear: year,
      filingStatus: taxProfile.filingStatus as FilingStatus,
      dependents: taxProfile.dependents,
      useItemized: taxProfile.useItemized,
      itemizedFederal: taxProfile.itemizedFederal,
      itemizedCA: taxProfile.itemizedCA,
      otherJointIncome: taxProfile.otherJointIncome,
    },
    household: {
      wages: household.projectedBox1Wages,
      federalWithholding: household.projectedFederalWH,
      stateWithholding: household.projectedStateWH,
    },
    brokerage,
  });

  return NextResponse.json({ result, household, brokerage });
}

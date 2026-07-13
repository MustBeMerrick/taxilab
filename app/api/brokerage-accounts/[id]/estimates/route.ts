import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const year = Number(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const estimate = await prisma.brokerageEstimate.findUnique({
    where: { accountId_year: { accountId: Number(id), year } },
  });
  return NextResponse.json(estimate);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const year = Number(body.year);

  const data = {
    stGainsMode: body.stGainsMode,
    stGainsAnnual: body.stGainsAnnual != null ? Number(body.stGainsAnnual) : null,
    stGainsYtd: body.stGainsYtd != null ? Number(body.stGainsYtd) : null,
    stGainsAsOf: body.stGainsAsOf ? new Date(body.stGainsAsOf) : null,

    ltGainsMode: body.ltGainsMode,
    ltGainsAnnual: body.ltGainsAnnual != null ? Number(body.ltGainsAnnual) : null,
    ltGainsYtd: body.ltGainsYtd != null ? Number(body.ltGainsYtd) : null,
    ltGainsAsOf: body.ltGainsAsOf ? new Date(body.ltGainsAsOf) : null,

    qualifiedDivMode: body.qualifiedDivMode,
    qualifiedDivAnnual: body.qualifiedDivAnnual != null ? Number(body.qualifiedDivAnnual) : null,
    qualifiedDivYtd: body.qualifiedDivYtd != null ? Number(body.qualifiedDivYtd) : null,
    qualifiedDivAsOf: body.qualifiedDivAsOf ? new Date(body.qualifiedDivAsOf) : null,

    ordinaryDivMode: body.ordinaryDivMode,
    ordinaryDivAnnual: body.ordinaryDivAnnual != null ? Number(body.ordinaryDivAnnual) : null,
    ordinaryDivYtd: body.ordinaryDivYtd != null ? Number(body.ordinaryDivYtd) : null,
    ordinaryDivAsOf: body.ordinaryDivAsOf ? new Date(body.ordinaryDivAsOf) : null,

    interestMode: body.interestMode,
    interestAnnual: body.interestAnnual != null ? Number(body.interestAnnual) : null,
    interestYtd: body.interestYtd != null ? Number(body.interestYtd) : null,
    interestAsOf: body.interestAsOf ? new Date(body.interestAsOf) : null,
  };

  const estimate = await prisma.brokerageEstimate.upsert({
    where: { accountId_year: { accountId: Number(id), year } },
    create: { accountId: Number(id), year, ...data },
    update: data,
  });
  return NextResponse.json(estimate);
}

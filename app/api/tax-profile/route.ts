import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const year = Number(request.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const profile = await prisma.taxProfile.findUnique({ where: { year } });
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const data = {
    filingStatus: body.filingStatus,
    dependents: Number(body.dependents ?? 0),
    useItemized: Boolean(body.useItemized ?? false),
    itemizedFederal: Number(body.itemizedFederal ?? 0),
    itemizedCA: Number(body.itemizedCA ?? 0),
    otherJointIncome: Number(body.otherJointIncome ?? 0),
  };
  const profile = await prisma.taxProfile.upsert({
    where: { year: Number(body.year) },
    create: { year: Number(body.year), ...data },
    update: data,
  });
  return NextResponse.json(profile);
}

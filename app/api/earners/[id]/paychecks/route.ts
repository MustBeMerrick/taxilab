import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const paychecks = await prisma.paycheck.findMany({
    where: { earnerId: Number(id) },
    orderBy: { payDate: "asc" },
  });
  return NextResponse.json(paychecks);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const paycheck = await prisma.paycheck.create({
    data: {
      earnerId: Number(id),
      payDate: new Date(body.payDate),
      gross: Number(body.gross ?? 0),
      federalWH: Number(body.federalWH ?? 0),
      stateWH: Number(body.stateWH ?? 0),
      oasdi: Number(body.oasdi ?? 0),
      medicare: Number(body.medicare ?? 0),
      caSdi: Number(body.caSdi ?? 0),
      hsaPreTax: Number(body.hsaPreTax ?? 0),
      nonHsaPreTax: Number(body.nonHsaPreTax ?? 0),
      gtli: Number(body.gtli ?? 0),
      employerHsa: Number(body.employerHsa ?? 0),
      paidOut: Boolean(body.paidOut ?? false),
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(paycheck, { status: 201 });
}

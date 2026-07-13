import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const config = await prisma.w4Config.findUnique({ where: { earnerId: Number(id) } });
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const data = {
    filingStatusOnW4: body.filingStatusOnW4,
    multipleJobsChecked: Boolean(body.multipleJobsChecked),
    dependentsCredit: Number(body.dependentsCredit ?? 0),
    otherIncome: Number(body.otherIncome ?? 0),
    deductionsAdj: Number(body.deductionsAdj ?? 0),
    extraWithholding: Number(body.extraWithholding ?? 0),
    payFrequency: body.payFrequency,
  };
  const config = await prisma.w4Config.upsert({
    where: { earnerId: Number(id) },
    create: { earnerId: Number(id), ...data },
    update: data,
  });
  return NextResponse.json(config);
}

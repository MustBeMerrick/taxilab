import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const config = await prisma.dE4Config.findUnique({ where: { earnerId: Number(id) } });
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const data = {
    filingStatus: body.filingStatus,
    regularAllowances: Number(body.regularAllowances ?? 0),
    estimatedDeductions: Number(body.estimatedDeductions ?? 0),
    additionalWithholding: Number(body.additionalWithholding ?? 0),
    payFrequency: body.payFrequency,
  };
  const config = await prisma.dE4Config.upsert({
    where: { earnerId: Number(id) },
    create: { earnerId: Number(id), ...data },
    update: data,
  });
  return NextResponse.json(config);
}

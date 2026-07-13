import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; paycheckId: string }> };

const NUMERIC_FIELDS = [
  "gross",
  "federalWH",
  "stateWH",
  "oasdi",
  "medicare",
  "caSdi",
  "hsaPreTax",
  "nonHsaPreTax",
  "gtli",
  "employerHsa",
] as const;

export async function PATCH(request: NextRequest, { params }: Params) {
  const { paycheckId } = await params;
  const body = await request.json();
  const data: Record<string, unknown> = {};

  for (const field of NUMERIC_FIELDS) {
    if (body[field] !== undefined) data[field] = Number(body[field]);
  }
  if (body.payDate !== undefined) data.payDate = new Date(body.payDate);
  if (body.paidOut !== undefined) data.paidOut = Boolean(body.paidOut);
  if (body.notes !== undefined) data.notes = body.notes;

  const paycheck = await prisma.paycheck.update({
    where: { id: Number(paycheckId) },
    data,
  });
  return NextResponse.json(paycheck);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { paycheckId } = await params;
  await prisma.paycheck.delete({ where: { id: Number(paycheckId) } });
  return NextResponse.json({ ok: true });
}

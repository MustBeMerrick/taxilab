import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const account = await prisma.brokerageAccount.update({
    where: { id: Number(id) },
    data: { name: body.name, kind: body.kind },
  });
  return NextResponse.json(account);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.brokerageAccount.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}

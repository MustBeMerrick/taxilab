import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const earner = await prisma.earner.update({
    where: { id: Number(id) },
    data: { name: body.name },
  });
  return NextResponse.json(earner);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.earner.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}

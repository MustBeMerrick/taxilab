import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const accounts = await prisma.brokerageAccount.findMany({
    include: { estimates: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(accounts);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const account = await prisma.brokerageAccount.create({
    data: { name: body.name, kind: body.kind },
  });
  return NextResponse.json(account, { status: 201 });
}

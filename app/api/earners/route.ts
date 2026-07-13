import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const earners = await prisma.earner.findMany({
    include: { w4Config: true, de4Config: true },
    orderBy: { id: "asc" },
  });
  return NextResponse.json(earners);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const earner = await prisma.earner.create({
    data: { name: body.name },
  });
  return NextResponse.json(earner, { status: 201 });
}

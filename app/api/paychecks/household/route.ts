import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const paychecks = await prisma.paycheck.findMany({
    include: { earner: { select: { id: true, name: true } } },
    orderBy: { payDate: "asc" },
  });
  return NextResponse.json(paychecks);
}

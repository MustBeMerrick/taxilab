import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function generatePayDates(
  payFrequency: string,
  startDate: Date,
  taxYear: number,
): Date[] {
  const yearEnd = new Date(Date.UTC(taxYear, 11, 31));
  const dates: Date[] = [];

  if (payFrequency === "semimonthly") {
    let year = startDate.getUTCFullYear();
    let month = startDate.getUTCMonth();
    while (true) {
      for (const day of [1, 15]) {
        const d = new Date(Date.UTC(year, month, day));
        if (d >= startDate && d <= yearEnd) dates.push(d);
      }
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
      if (Date.UTC(year, month, 1) > yearEnd.getTime()) break;
    }
    return dates.sort((a, b) => a.getTime() - b.getTime());
  }

  if (payFrequency === "monthly") {
    let current = new Date(startDate);
    while (current <= yearEnd) {
      dates.push(new Date(current));
      current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, current.getUTCDate()));
    }
    return dates;
  }

  const stepDays = payFrequency === "weekly" ? 7 : 14; // biweekly
  let current = new Date(startDate);
  while (current <= yearEnd) {
    dates.push(new Date(current));
    current = new Date(current.getTime() + stepDays * 24 * 60 * 60 * 1000);
  }
  return dates;
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { payFrequency, startDate, taxYear, template } = body;

  const dates = generatePayDates(payFrequency, new Date(startDate), Number(taxYear));

  const rows = dates.map((payDate) => ({
    earnerId: Number(id),
    payDate,
    gross: Number(template.gross ?? 0),
    federalWH: Number(template.federalWH ?? 0),
    stateWH: Number(template.stateWH ?? 0),
    oasdi: Number(template.oasdi ?? 0),
    medicare: Number(template.medicare ?? 0),
    caSdi: Number(template.caSdi ?? 0),
    hsaPreTax: Number(template.hsaPreTax ?? 0),
    nonHsaPreTax: Number(template.nonHsaPreTax ?? 0),
    gtli: Number(template.gtli ?? 0),
    employerHsa: Number(template.employerHsa ?? 0),
    paidOut: false,
  }));

  await prisma.paycheck.createMany({ data: rows });
  return NextResponse.json({ created: rows.length });
}

import { NextRequest, NextResponse } from "next/server";
import { computeFederalWithholding } from "@/lib/withholding/federal";
import { computeCaWithholding } from "@/lib/withholding/california";

// Single-paycheck preview: calls Layer 2 directly, bypassing Layer 3/DB entirely.
export async function POST(request: NextRequest) {
  const body = await request.json();

  const federal = computeFederalWithholding({
    grossThisCheck: Number(body.grossThisCheck),
    payFrequency: body.payFrequency,
    w4Config: body.w4Config,
    taxYear: Number(body.taxYear),
  });

  const california = computeCaWithholding({
    grossThisCheck: Number(body.grossThisCheck),
    payFrequency: body.payFrequency,
    de4Config: body.de4Config,
    taxYear: Number(body.taxYear),
  });

  return NextResponse.json({ federal, california });
}

import { describe, expect, it } from "vitest";
import { resolveIncomeLine, resolveBrokerageEstimate } from "@/lib/projection/brokerage";

describe("resolveIncomeLine", () => {
  it("manual mode passes the annual figure through unchanged", () => {
    const result = resolveIncomeLine(
      { mode: "manual", annual: 4200, ytd: null, asOf: null },
      2026,
    );
    expect(result).toBe(4200);
  });

  it("YTD-extrapolate mode linearly projects to year-end", () => {
    // Halfway through the year, YTD 5000 -> projected ~10000 (+/- a few days' slop).
    const result = resolveIncomeLine(
      { mode: "ytd-extrapolate", annual: null, ytd: 5000, asOf: new Date(Date.UTC(2026, 5, 30)) },
      2026,
    );
    expect(result).toBeGreaterThan(9800);
    expect(result).toBeLessThan(10300);
  });

  it("YTD-extrapolate near year-end barely scales up", () => {
    const result = resolveIncomeLine(
      { mode: "ytd-extrapolate", annual: null, ytd: 9900, asOf: new Date(Date.UTC(2026, 11, 30)) },
      2026,
    );
    expect(result).toBeGreaterThanOrEqual(9900);
    expect(result).toBeLessThan(10500);
  });

  it("missing YTD/asOf resolves to 0 rather than throwing", () => {
    const result = resolveIncomeLine({ mode: "ytd-extrapolate", annual: null, ytd: null, asOf: null }, 2026);
    expect(result).toBe(0);
  });
});

describe("resolveBrokerageEstimate", () => {
  it("resolves all five income lines independently", () => {
    const result = resolveBrokerageEstimate(
      {
        stGains: { mode: "manual", annual: 1000, ytd: null, asOf: null },
        ltGains: { mode: "manual", annual: 2000, ytd: null, asOf: null },
        qualifiedDiv: { mode: "manual", annual: 300, ytd: null, asOf: null },
        ordinaryDiv: { mode: "manual", annual: 400, ytd: null, asOf: null },
        interest: { mode: "manual", annual: 500, ytd: null, asOf: null },
      },
      2026,
    );
    expect(result).toEqual({
      stGains: 1000,
      ltGains: 2000,
      qualifiedDiv: 300,
      ordinaryDiv: 400,
      interest: 500,
    });
  });
});

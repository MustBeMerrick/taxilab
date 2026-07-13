"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";

const TAX_YEAR = 2026;

interface WaterfallSide {
  wages: number;
  interest: number;
  ordinaryDividends: number;
  qualifiedDividends: number;
  shortTermGains: number;
  longTermGains: number;
  otherIncome: number;
  totalIncome: number;
  deduction: number;
  taxableIncome: number;
  ordinaryTax: number;
  extraTax: number;
  extraTaxBreakdown: Record<string, number>;
  totalTax: number;
  withholding: number;
  refundOrOwed: number;
}

interface SummaryResult {
  federal: WaterfallSide;
  california: WaterfallSide;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const EXTRA_TAX_LABELS: Record<string, string> = {
  ltcgTax: "LTCG tax",
  niit: "NIIT",
  addlMedicare: "Additional Medicare",
  mentalHealthServicesTax: "Mental Health Services Tax",
};

export default function SummaryPage() {
  const [actual, setActual] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [whatIfResult, setWhatIfResult] = useState<{ whatIf: SummaryResult } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/projection/summary?year=${TAX_YEAR}`);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setActual(data.result);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const stored = sessionStorage.getItem("taxilab-whatif");
    if (stored) {
      try {
        setWhatIfResult(JSON.parse(stored));
      } catch {
        // ignore malformed cache
      }
    }
  }, [load]);

  const displayed = showWhatIf && whatIfResult ? whatIfResult.whatIf : actual;

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;
  if (error)
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
    );
  if (!displayed) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Summary — {TAX_YEAR}</h1>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showWhatIf}
            onChange={(e) => setShowWhatIf(e.target.checked)}
            disabled={!whatIfResult}
          />
          Show what-if projection
        </label>
      </div>

      {!whatIfResult && (
        <p className="mb-4 text-xs text-slate-500">
          Configure a what-if scenario on the Withholding screen, then return here to compare.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Waterfall title="Federal" side={displayed.federal} />
        <Waterfall title="California" side={displayed.california} />
      </div>
    </div>
  );
}

function Waterfall({ title, side }: { title: string; side: WaterfallSide }) {
  const rows: { label: string; value: number; bold?: boolean }[] = [
    { label: "Wages", value: side.wages },
    { label: "Interest", value: side.interest },
    { label: "Ordinary dividends", value: side.ordinaryDividends },
    { label: "Qualified dividends", value: side.qualifiedDividends },
    { label: "Short-term gains", value: side.shortTermGains },
    { label: "Long-term gains", value: side.longTermGains },
    { label: "Other income", value: side.otherIncome },
    { label: "= Total income", value: side.totalIncome, bold: true },
    { label: "− Standard/itemized deduction", value: -side.deduction },
    { label: "= Taxable income", value: side.taxableIncome, bold: true },
    { label: "Ordinary tax", value: side.ordinaryTax },
    ...Object.entries(side.extraTaxBreakdown)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => ({ label: EXTRA_TAX_LABELS[k] ?? k, value: v })),
    { label: "= Total tax liability", value: side.totalTax, bold: true },
    { label: "− Total withholding", value: -side.withholding },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={clsx("border-b border-slate-100 last:border-0", row.bold && "font-semibold")}>
              <td className="py-1.5 text-slate-600">{row.label}</td>
              <td className="py-1.5 text-right">{money(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className={clsx(
          "mt-3 rounded-md p-3 text-center text-lg font-semibold",
          side.refundOrOwed >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
        )}
      >
        {side.refundOrOwed >= 0 ? "Refund" : "Owed"}: {money(Math.abs(side.refundOrOwed))}
      </div>
    </div>
  );
}

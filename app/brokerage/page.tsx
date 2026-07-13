"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";

const TAX_YEAR = 2026;

interface Account {
  id: number;
  name: string;
  kind: string;
}

interface Estimate {
  stGainsMode: string;
  stGainsAnnual: number | null;
  stGainsYtd: number | null;
  stGainsAsOf: string | null;
  ltGainsMode: string;
  ltGainsAnnual: number | null;
  ltGainsYtd: number | null;
  ltGainsAsOf: string | null;
  qualifiedDivMode: string;
  qualifiedDivAnnual: number | null;
  qualifiedDivYtd: number | null;
  qualifiedDivAsOf: string | null;
  ordinaryDivMode: string;
  ordinaryDivAnnual: number | null;
  ordinaryDivYtd: number | null;
  ordinaryDivAsOf: string | null;
  interestMode: string;
  interestAnnual: number | null;
  interestYtd: number | null;
  interestAsOf: string | null;
}

const INCOME_LINES = [
  { key: "stGains", label: "Short-term gains" },
  { key: "ltGains", label: "Long-term gains" },
  { key: "qualifiedDiv", label: "Qualified dividends" },
  { key: "ordinaryDiv", label: "Ordinary dividends" },
  { key: "interest", label: "Interest" },
] as const;

function emptyEstimate(): Estimate {
  const base: Record<string, unknown> = {};
  for (const line of INCOME_LINES) {
    base[`${line.key}Mode`] = "manual";
    base[`${line.key}Annual`] = 0;
    base[`${line.key}Ytd`] = null;
    base[`${line.key}AsOf`] = null;
  }
  return base as unknown as Estimate;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function projectLinearly(ytd: number, asOf: string, taxYear: number): number {
  const start = Date.UTC(taxYear, 0, 1);
  const end = Date.UTC(taxYear, 11, 31);
  const asOfMs = new Date(asOf).getTime();
  const fraction = Math.min(1, Math.max(1 / 365, (asOfMs - start) / (end - start)));
  return ytd / fraction;
}

export default function BrokeragePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [estimate, setEstimate] = useState<Estimate>(emptyEstimate());
  const [saving, setSaving] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");

  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/brokerage-accounts");
    const data: Account[] = await res.json();
    setAccounts(data);
    if (data.length > 0 && activeId === null) setActiveId(data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const loadEstimate = useCallback(async (accountId: number) => {
    const res = await fetch(`/api/brokerage-accounts/${accountId}/estimates?year=${TAX_YEAR}`);
    const data = await res.json();
    setEstimate(data ?? emptyEstimate());
  }, []);

  useEffect(() => {
    if (activeId) loadEstimate(activeId);
  }, [activeId, loadEstimate]);

  async function handleAddAccount() {
    if (!newAccountName.trim()) return;
    const res = await fetch("/api/brokerage-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAccountName, kind: "taxable" }),
    });
    const account = await res.json();
    setNewAccountName("");
    await loadAccounts();
    setActiveId(account.id);
  }

  async function handleSave() {
    if (!activeId) return;
    setSaving(true);
    await fetch(`/api/brokerage-accounts/${activeId}/estimates`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: TAX_YEAR, ...estimate }),
    });
    setSaving(false);
  }

  function updateLine(key: string, field: string, value: unknown) {
    setEstimate((e) => ({ ...e, [`${key}${field}`]: value }));
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Brokerage</h1>

      <div className="mb-4 flex items-center gap-3">
        <div className="flex gap-1 rounded-md bg-slate-100 p-1">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={clsx(
                "rounded px-3 py-1.5 text-sm font-medium",
                activeId === a.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
        <input
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          placeholder="New account name"
          className="rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={handleAddAccount}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          + Add account
        </button>
      </div>

      {activeId && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase text-slate-500">
                <th className="py-2">Income type</th>
                <th className="py-2">Mode</th>
                <th className="py-2">Annual estimate</th>
                <th className="py-2">YTD</th>
                <th className="py-2">As of</th>
                <th className="py-2">Projected</th>
              </tr>
            </thead>
            <tbody>
              {INCOME_LINES.map((line) => {
                const mode = estimate[`${line.key}Mode` as keyof Estimate] as string;
                const annual = (estimate[`${line.key}Annual` as keyof Estimate] as number) ?? 0;
                const ytd = (estimate[`${line.key}Ytd` as keyof Estimate] as number) ?? 0;
                const asOf = (estimate[`${line.key}AsOf` as keyof Estimate] as string) ?? "";
                const projected =
                  mode === "manual"
                    ? annual
                    : ytd && asOf
                      ? projectLinearly(ytd, asOf, TAX_YEAR)
                      : 0;
                return (
                  <tr key={line.key} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 font-medium text-slate-700">{line.label}</td>
                    <td className="py-2">
                      <select
                        value={mode}
                        onChange={(e) => updateLine(line.key, "Mode", e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1"
                      >
                        <option value="manual">Manual</option>
                        <option value="ytd-extrapolate">YTD → extrapolate</option>
                      </select>
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        disabled={mode !== "manual"}
                        value={annual}
                        onChange={(e) => updateLine(line.key, "Annual", Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        disabled={mode !== "ytd-extrapolate"}
                        value={ytd}
                        onChange={(e) => updateLine(line.key, "Ytd", Number(e.target.value))}
                        className="w-28 rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="date"
                        disabled={mode !== "ytd-extrapolate"}
                        value={asOf ? asOf.slice(0, 10) : ""}
                        onChange={(e) => updateLine(line.key, "AsOf", e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="py-2 font-medium">{money(projected)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save estimates"}
          </button>
        </div>
      )}
    </div>
  );
}

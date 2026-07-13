"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import clsx from "clsx";

interface Earner {
  id: number;
  name: string;
}

interface Paycheck {
  id: number;
  earnerId: number;
  payDate: string;
  gross: number;
  federalWH: number;
  stateWH: number;
  oasdi: number;
  medicare: number;
  caSdi: number;
  hsaPreTax: number;
  nonHsaPreTax: number;
  gtli: number;
  employerHsa: number;
  paidOut: boolean;
  notes: string | null;
}

const COLUMNS: { key: keyof Paycheck; label: string; numeric: boolean }[] = [
  { key: "payDate", label: "Pay Date", numeric: false },
  { key: "gross", label: "Gross", numeric: true },
  { key: "federalWH", label: "Federal", numeric: true },
  { key: "stateWH", label: "State", numeric: true },
  { key: "oasdi", label: "OASDI", numeric: true },
  { key: "medicare", label: "Medicare", numeric: true },
  { key: "caSdi", label: "CA SDI", numeric: true },
  { key: "hsaPreTax", label: "HSA (pre-tax)", numeric: true },
  { key: "nonHsaPreTax", label: "Other Pre-Tax", numeric: true },
  { key: "gtli", label: "GTLI", numeric: true },
  { key: "employerHsa", label: "Employer HSA", numeric: true },
];

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Take-home isn't stored -- it's derived from the other columns. GTLI (imputed
// income) and Employer HSA (employer-paid) don't reduce actual take-home pay.
function takeHomeOf(p: Pick<Paycheck, "gross" | "federalWH" | "stateWH" | "oasdi" | "medicare" | "caSdi" | "hsaPreTax" | "nonHsaPreTax">) {
  return p.gross - p.federalWH - p.stateWH - p.oasdi - p.medicare - p.caSdi - p.hsaPreTax - p.nonHsaPreTax;
}

function parseMoney(text: string): number {
  const cleaned = text.replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Controlled currency input: shows raw digits while focused (so clearing
 * to type a new value actually works), formats as "$1,234.00" on blur/Enter.
 */
function CurrencyField({
  value,
  onCommit,
  className,
}: {
  value: number;
  onCommit: (n: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(value === 0 ? "" : String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value === 0 ? "$0.00" : money(value));
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onFocus={(e) => {
        setFocused(true);
        setText(value === 0 ? "" : String(value));
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const n = parseMoney(text);
        onCommit(n);
        setText(n === 0 ? "$0.00" : money(n));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={className}
    />
  );
}

function emptyRow(): Omit<Paycheck, "id" | "earnerId"> {
  return {
    payDate: new Date().toISOString().slice(0, 10),
    gross: 0,
    federalWH: 0,
    stateWH: 0,
    oasdi: 0,
    medicare: 0,
    caSdi: 0,
    hsaPreTax: 0,
    nonHsaPreTax: 0,
    gtli: 0,
    employerHsa: 0,
    paidOut: false,
    notes: null,
  };
}

export default function PaychecksPage() {
  const [earners, setEarners] = useState<Earner[]>([]);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [activeTab, setActiveTab] = useState<number | "household">("household");
  const [loading, setLoading] = useState(true);
  const [showPrepopulate, setShowPrepopulate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const earnersRes = await fetch("/api/earners");
    const earnersData: Earner[] = await earnersRes.json();
    setEarners(earnersData);
    if (activeTab === "household") {
      const res = await fetch("/api/paychecks/household");
      setPaychecks(await res.json());
    } else if (typeof activeTab === "number") {
      const res = await fetch(`/api/earners/${activeTab}/paychecks`);
      setPaychecks(await res.json());
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleEarnerId = typeof activeTab === "number" ? activeTab : null;

  const ytd = useMemo(() => sumRows(paychecks.filter((p) => p.paidOut)), [paychecks]);
  const projected = useMemo(() => sumRows(paychecks), [paychecks]);

  async function handleAddRow() {
    if (!visibleEarnerId) return;
    const res = await fetch(`/api/earners/${visibleEarnerId}/paychecks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emptyRow()),
    });
    if (res.ok) load();
  }

  async function handleUpdateCell(paycheck: Paycheck, field: keyof Paycheck, value: string | number | boolean) {
    setPaychecks((rows) => rows.map((r) => (r.id === paycheck.id ? { ...r, [field]: value } : r)));
    await fetch(`/api/earners/${paycheck.earnerId}/paychecks/${paycheck.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }


  async function handleDeleteRow(paycheck: Paycheck) {
    await fetch(`/api/earners/${paycheck.earnerId}/paychecks/${paycheck.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Paychecks</h1>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1 rounded-md bg-slate-100 p-1">
          <TabButton active={activeTab === "household"} onClick={() => setActiveTab("household")}>
            Household
          </TabButton>
          {earners.map((e) => (
            <TabButton key={e.id} active={activeTab === e.id} onClick={() => setActiveTab(e.id)}>
              {e.name}
            </TabButton>
          ))}
        </div>
        {visibleEarnerId && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrepopulate((s) => !s)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Pre-populate from template
            </button>
            <button
              onClick={handleAddRow}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            >
              + Add row
            </button>
          </div>
        )}
      </div>

      {visibleEarnerId && showPrepopulate && (
        <PrepopulatePanel earnerId={visibleEarnerId} onDone={() => { setShowPrepopulate(false); load(); }} />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                {activeTab === "household" && <th className="px-3 py-2">Earner</th>}
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2">
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2">Take-Home</th>
                <th className="px-3 py-2">Paid Out</th>
                {visibleEarnerId && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              <SummaryRow label="YTD" sums={ytd} showEarnerCol={activeTab === "household"} />
              <SummaryRow label="Projected" sums={projected} showEarnerCol={activeTab === "household"} />
              {paychecks.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {activeTab === "household" && (
                    <td className="px-3 py-1.5 text-slate-600">
                      {earners.find((e) => e.id === p.earnerId)?.name}
                    </td>
                  )}
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-1 py-1">
                      {visibleEarnerId ? (
                        <input
                          key={col.key}
                          type={col.numeric ? "number" : "date"}
                          defaultValue={col.numeric ? (p[col.key] as number) : (p[col.key] as string).slice(0, 10)}
                          onBlur={(e) =>
                            handleUpdateCell(p, col.key, col.numeric ? Number(e.target.value) : e.target.value)
                          }
                          className={clsx(
                            "rounded border border-transparent py-0.5 hover:border-slate-300 focus:border-slate-500 focus:outline-none",
                            col.numeric ? "w-24 px-1.5" : "w-[6.6rem] pl-1.5 pr-0.5",
                          )}
                        />
                      ) : (
                        <span className="px-1.5">
                          {col.numeric ? money(p[col.key] as number) : (p[col.key] as string).slice(0, 10)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-slate-600">{money(takeHomeOf(p))}</td>
                  <td className="px-3 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={p.paidOut}
                      disabled={!visibleEarnerId}
                      onChange={(e) => handleUpdateCell(p, "paidOut", e.target.checked)}
                    />
                  </td>
                  {visibleEarnerId && (
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => handleDeleteRow(p)}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded px-3 py-1.5 text-sm font-medium",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
      )}
    >
      {children}
    </button>
  );
}

function sumRows(rows: Paycheck[]) {
  const keys: (keyof Paycheck)[] = [
    "gross",
    "federalWH",
    "stateWH",
    "oasdi",
    "medicare",
    "caSdi",
    "hsaPreTax",
    "nonHsaPreTax",
    "gtli",
    "employerHsa",
  ];
  const totals: Record<string, number> = {};
  for (const key of keys) totals[key] = rows.reduce((sum, r) => sum + (r[key] as number), 0);
  totals.takeHome = rows.reduce((sum, r) => sum + takeHomeOf(r), 0);
  return totals;
}

function SummaryRow({
  label,
  sums,
  showEarnerCol,
}: {
  label: string;
  sums: Record<string, number>;
  showEarnerCol: boolean;
}) {
  return (
    <tr className="border-b border-slate-200 bg-amber-50 font-medium">
      {showEarnerCol && <td className="px-3 py-1.5">{label}</td>}
      {!showEarnerCol && <td className="px-3 py-1.5">{label}</td>}
      {COLUMNS.slice(1).map((col) => (
        <td key={col.key} className="px-3 py-1.5">
          {col.numeric ? money(sums[col.key] ?? 0) : ""}
        </td>
      ))}
      <td className="px-3 py-1.5">{money(sums.takeHome ?? 0)}</td>
      <td />
    </tr>
  );
}

function PrepopulatePanel({ earnerId, onDone }: { earnerId: number; onDone: () => void }) {
  const [payFrequency, setPayFrequency] = useState("biweekly");
  const [startDate, setStartDate] = useState("2026-01-02");
  const [taxYear, setTaxYear] = useState(2026);
  const [template, setTemplate] = useState(emptyRow());
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    await fetch(`/api/earners/${earnerId}/paychecks/prepopulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payFrequency, startDate, taxYear, template }),
    });
    setSubmitting(false);
    onDone();
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">Pre-populate from template</h2>
      <div className="mb-3 grid grid-cols-4 gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Frequency
          <select
            value={payFrequency}
            onChange={(e) => setPayFrequency(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="semimonthly">Semimonthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          Tax year
          <input
            type="number"
            value={taxYear}
            onChange={(e) => setTaxYear(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1"
          />
        </label>
      </div>
      <div className="mb-3 grid grid-cols-6 gap-3 text-sm">
        {COLUMNS.filter((c) => c.numeric).map((col) => (
          <label key={col.key} className="flex flex-col gap-1">
            {col.label}
            <CurrencyField
              value={template[col.key as keyof typeof template] as number}
              onCommit={(n) => setTemplate((t) => ({ ...t, [col.key]: n }))}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {submitting ? "Generating..." : "Generate rows for year"}
      </button>
    </div>
  );
}

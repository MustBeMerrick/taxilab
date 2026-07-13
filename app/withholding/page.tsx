"use client";

import { useEffect, useState, useCallback } from "react";
import clsx from "clsx";

const TAX_YEAR = 2026;

interface Earner {
  id: number;
  name: string;
}

interface W4Config {
  filingStatusOnW4: string;
  multipleJobsChecked: boolean;
  dependentsCredit: number;
  otherIncome: number;
  deductionsAdj: number;
  extraWithholding: number;
  payFrequency: string;
}

interface DE4Config {
  filingStatus: string;
  regularAllowances: number;
  estimatedDeductions: number;
  additionalWithholding: number;
  payFrequency: string;
}

interface Paycheck {
  id: number;
  federalWH: number;
  stateWH: number;
  paidOut: boolean;
  payDate: string;
}

function money(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const defaultW4: W4Config = {
  filingStatusOnW4: "mfj",
  multipleJobsChecked: true,
  dependentsCredit: 0,
  otherIncome: 0,
  deductionsAdj: 0,
  extraWithholding: 0,
  payFrequency: "biweekly",
};

const defaultDe4: DE4Config = {
  filingStatus: "mfj-two-incomes",
  regularAllowances: 1,
  estimatedDeductions: 0,
  additionalWithholding: 0,
  payFrequency: "biweekly",
};

export default function WithholdingPage() {
  const [earners, setEarners] = useState<Earner[]>([]);
  const [activeEarnerId, setActiveEarnerId] = useState<number | null>(null);
  const [w4, setW4] = useState<W4Config>(defaultW4);
  const [de4, setDe4] = useState<DE4Config>(defaultDe4);
  const [gross, setGross] = useState(3000);
  const [preview, setPreview] = useState<{
    federal: { withholding: number };
    california: { withholding: number };
  } | null>(null);
  const [paychecks, setPaychecks] = useState<Paycheck[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/earners")
      .then((r) => r.json())
      .then((data: Earner[]) => {
        setEarners(data);
        if (data.length > 0) setActiveEarnerId(data[0].id);
      });
  }, []);

  const loadEarnerData = useCallback(async (earnerId: number) => {
    const [w4Res, de4Res, paychecksRes] = await Promise.all([
      fetch(`/api/earners/${earnerId}/w4-config`),
      fetch(`/api/earners/${earnerId}/de4-config`),
      fetch(`/api/earners/${earnerId}/paychecks`),
    ]);
    const w4Data = await w4Res.json();
    const de4Data = await de4Res.json();
    setW4(w4Data ?? defaultW4);
    setDe4(de4Data ?? defaultDe4);
    setPaychecks(await paychecksRes.json());
  }, []);

  useEffect(() => {
    if (activeEarnerId) loadEarnerData(activeEarnerId);
  }, [activeEarnerId, loadEarnerData]);

  const runPreview = useCallback(async () => {
    const res = await fetch("/api/withholding/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taxYear: TAX_YEAR,
        payFrequency: w4.payFrequency,
        grossThisCheck: gross,
        w4Config: w4,
        de4Config: de4,
      }),
    });
    setPreview(await res.json());
  }, [w4, de4, gross]);

  useEffect(() => {
    runPreview();
  }, [runPreview]);

  async function handleSave() {
    if (!activeEarnerId) return;
    setSaving(true);
    await Promise.all([
      fetch(`/api/earners/${activeEarnerId}/w4-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(w4),
      }),
      fetch(`/api/earners/${activeEarnerId}/de4-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(de4),
      }),
    ]);
    setSaving(false);
  }

  const paidChecks = paychecks.filter((p) => p.paidOut);
  const avgFederal = paidChecks.length
    ? paidChecks.reduce((s, p) => s + p.federalWH, 0) / paidChecks.length
    : 0;
  const avgState = paidChecks.length
    ? paidChecks.reduce((s, p) => s + p.stateWH, 0) / paidChecks.length
    : 0;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Withholding</h1>

      <div className="mb-4 flex gap-1 rounded-md bg-slate-100 p-1 w-fit">
        {earners.map((e) => (
          <button
            key={e.id}
            onClick={() => setActiveEarnerId(e.id)}
            className={clsx(
              "rounded px-3 py-1.5 text-sm font-medium",
              activeEarnerId === e.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
            )}
          >
            {e.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">Preview gross this check</label>
        <input
          type="number"
          value={gross}
          onChange={(e) => setGross(Number(e.target.value))}
          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save W-4 / DE-4"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">W-4 (Federal)</h2>
          <div className="space-y-3 text-sm">
            <Field label="Filing status">
              <select
                value={w4.filingStatusOnW4}
                onChange={(e) => setW4({ ...w4, filingStatusOnW4: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              >
                <option value="single">Single</option>
                <option value="mfj">Married Filing Jointly</option>
                <option value="hoh">Head of Household</option>
              </select>
            </Field>
            <Field label="Step 2: multiple jobs checkbox">
              <input
                type="checkbox"
                checked={w4.multipleJobsChecked}
                onChange={(e) => setW4({ ...w4, multipleJobsChecked: e.target.checked })}
              />
            </Field>
            <Field label="Step 3: dependents credit ($)">
              <input
                type="number"
                value={w4.dependentsCredit}
                onChange={(e) => setW4({ ...w4, dependentsCredit: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Step 4a: other income ($)">
              <input
                type="number"
                value={w4.otherIncome}
                onChange={(e) => setW4({ ...w4, otherIncome: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Step 4b: deductions ($)">
              <input
                type="number"
                value={w4.deductionsAdj}
                onChange={(e) => setW4({ ...w4, deductionsAdj: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Step 4c: extra withholding ($)">
              <input
                type="number"
                value={w4.extraWithholding}
                onChange={(e) => setW4({ ...w4, extraWithholding: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Pay frequency">
              <select
                value={w4.payFrequency}
                onChange={(e) => setW4({ ...w4, payFrequency: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="semimonthly">Semimonthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
            <span className="text-slate-500">Expected federal withholding: </span>
            <span className="font-semibold">{preview ? money(preview.federal.withholding) : "..."}</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">DE-4 (California)</h2>
          <div className="space-y-3 text-sm">
            <Field label="Filing status">
              <select
                value={de4.filingStatus}
                onChange={(e) => setDe4({ ...de4, filingStatus: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              >
                <option value="single">Single</option>
                <option value="mfj-one-income">Married, one income</option>
                <option value="mfj-two-incomes">Married, two incomes</option>
                <option value="hoh">Head of Household</option>
              </select>
            </Field>
            <Field label="Line 1: regular allowances">
              <input
                type="number"
                value={de4.regularAllowances}
                onChange={(e) => setDe4({ ...de4, regularAllowances: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Line 2: estimated deduction allowances">
              <input
                type="number"
                value={de4.estimatedDeductions}
                onChange={(e) => setDe4({ ...de4, estimatedDeductions: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Line 3: additional amount ($)">
              <input
                type="number"
                value={de4.additionalWithholding}
                onChange={(e) => setDe4({ ...de4, additionalWithholding: Number(e.target.value) })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              />
            </Field>
            <Field label="Pay frequency">
              <select
                value={de4.payFrequency}
                onChange={(e) => setDe4({ ...de4, payFrequency: e.target.value })}
                className="w-full rounded border border-slate-300 px-2 py-1"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="semimonthly">Semimonthly</option>
                <option value="monthly">Monthly</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
            <span className="text-slate-500">Expected CA withholding: </span>
            <span className="font-semibold">{preview ? money(preview.california.withholding) : "..."}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Compare to actual</h2>
        {paidChecks.length === 0 ? (
          <p className="text-sm text-slate-500">No paid-out paychecks logged yet for this earner.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <CompareRow
              label="Federal"
              expected={preview?.federal.withholding ?? 0}
              actual={avgFederal}
            />
            <CompareRow label="CA State" expected={preview?.california.withholding ?? 0} actual={avgState} />
          </div>
        )}
      </div>

      {activeEarnerId && (
        <WhatIfPanel earnerId={activeEarnerId} baseW4={w4} baseDe4={de4} paychecks={paychecks} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-slate-600">{label}</label>
      <div className="w-40">{children}</div>
    </div>
  );
}

function CompareRow({ label, expected, actual }: { label: string; expected: number; actual: number }) {
  const drift = actual - expected;
  const driftPct = expected !== 0 ? (drift / expected) * 100 : 0;
  const significant = Math.abs(driftPct) > 10;
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="mb-1 text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="flex items-baseline justify-between">
        <span>Expected: {money(expected)}</span>
        <span>Actual avg: {money(actual)}</span>
      </div>
      <div className={clsx("mt-1 text-xs font-medium", significant ? "text-red-600" : "text-slate-400")}>
        Drift: {money(drift)} ({driftPct.toFixed(1)}%){significant && " -- worth reviewing"}
      </div>
    </div>
  );
}

function WhatIfPanel({
  earnerId,
  baseW4,
  baseDe4,
  paychecks,
}: {
  earnerId: number;
  baseW4: W4Config;
  baseDe4: DE4Config;
  paychecks: Paycheck[];
}) {
  const nextUnpaid = paychecks
    .filter((p) => !p.paidOut)
    .sort((a, b) => a.payDate.localeCompare(b.payDate))[0];

  const [enabled, setEnabled] = useState(false);
  const [effectiveDate, setEffectiveDate] = useState(
    nextUnpaid?.payDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [w4Override, setW4Override] = useState<W4Config>(baseW4);
  const [de4Override, setDe4Override] = useState<DE4Config>(baseDe4);
  const [result, setResult] = useState<{
    baseline: { federal: { refundOrOwed: number }; california: { refundOrOwed: number } };
    whatIf: { federal: { refundOrOwed: number }; california: { refundOrOwed: number } };
    delta: { federalRefundDelta: number; caRefundDelta: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setW4Override(baseW4);
    setDe4Override(baseDe4);
  }, [baseW4, baseDe4]);

  async function runWhatIf() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/projection/what-if", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: TAX_YEAR,
        targetEarnerId: earnerId,
        effectiveDate,
        newW4Config: w4Override,
        newDe4Config: de4Override,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Could not compute what-if projection.");
      return;
    }
    const data = await res.json();
    setResult(data);
    // Bridge to the Summary screen's "show what-if projection" toggle.
    sessionStorage.setItem("taxilab-whatif", JSON.stringify(data));
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">What-if: apply new settings going forward</h2>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enable
        </label>
      </div>
      {enabled && (
        <>
          <div className="mb-3 flex items-center gap-3 text-sm">
            <label className="text-slate-600">Apply starting</label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="rounded border border-slate-300 px-2 py-1"
            />
            <label className="ml-4 text-slate-600">Extra federal withholding ($/check)</label>
            <input
              type="number"
              value={w4Override.extraWithholding}
              onChange={(e) => setW4Override({ ...w4Override, extraWithholding: Number(e.target.value) })}
              className="w-24 rounded border border-slate-300 px-2 py-1"
            />
            <label className="ml-4 text-slate-600">Extra CA withholding ($/check)</label>
            <input
              type="number"
              value={de4Override.additionalWithholding}
              onChange={(e) => setDe4Override({ ...de4Override, additionalWithholding: Number(e.target.value) })}
              className="w-24 rounded border border-slate-300 px-2 py-1"
            />
            <button
              onClick={runWhatIf}
              disabled={loading}
              className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {loading ? "Computing..." : "Recompute"}
            </button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <DiffCard
                label="Federal refund"
                current={result.baseline.federal.refundOrOwed}
                whatIf={result.whatIf.federal.refundOrOwed}
                delta={result.delta.federalRefundDelta}
              />
              <DiffCard
                label="CA refund"
                current={result.baseline.california.refundOrOwed}
                whatIf={result.whatIf.california.refundOrOwed}
                delta={result.delta.caRefundDelta}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DiffCard({
  label,
  current,
  whatIf,
  delta,
}: {
  label: string;
  current: number;
  whatIf: number;
  delta: number;
}) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <div className="mb-1 text-xs font-medium uppercase text-slate-500">{label}</div>
      <p>Current projected: {money(current)}</p>
      <p>With these changes: {money(whatIf)}</p>
      <p className={clsx("font-semibold", delta >= 0 ? "text-green-700" : "text-red-700")}>
        Delta: {delta >= 0 ? "+" : ""}
        {money(delta)}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";

const TAX_YEAR = 2026;

interface Earner {
  id: number;
  name: string;
}

interface TaxProfile {
  year: number;
  filingStatus: string;
  dependents: number;
  useItemized: boolean;
  itemizedFederal: number;
  itemizedCA: number;
  otherJointIncome: number;
}

const defaultProfile: TaxProfile = {
  year: TAX_YEAR,
  filingStatus: "mfj",
  dependents: 0,
  useItemized: false,
  itemizedFederal: 0,
  itemizedCA: 0,
  otherJointIncome: 0,
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<TaxProfile>(defaultProfile);
  const [earners, setEarners] = useState<Earner[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEarner, setSavingEarner] = useState<number | null>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [profileRes, earnersRes] = await Promise.all([
      fetch(`/api/tax-profile?year=${TAX_YEAR}`),
      fetch("/api/earners"),
    ]);
    const profileData = await profileRes.json();
    setProfile(profileData ?? defaultProfile);
    setEarners(await earnersRes.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveProfile() {
    setSavingProfile(true);
    await fetch("/api/tax-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setSavingProfile(false);
  }

  async function handleRenameEarner(id: number, name: string) {
    setSavingEarner(id);
    await fetch(`/api/earners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSavingEarner(null);
  }

  async function handleBackup() {
    setBackupStatus("Running...");
    const res = await fetch("/api/settings/backup", { method: "POST" });
    const data = await res.json();
    setBackupStatus(res.ok ? "Backup complete." : `Backup failed: ${data.error}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Tax profile — {TAX_YEAR}</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <label className="flex flex-col gap-1">
            Filing status
            <select
              value={profile.filingStatus}
              onChange={(e) => setProfile({ ...profile, filingStatus: e.target.value })}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="single">Single</option>
              <option value="mfj">Married Filing Jointly</option>
              <option value="mfs">Married Filing Separately</option>
              <option value="hoh">Head of Household</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Dependents
            <input
              type="number"
              value={profile.dependents}
              onChange={(e) => setProfile({ ...profile, dependents: Number(e.target.value) })}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={profile.useItemized}
              onChange={(e) => setProfile({ ...profile, useItemized: e.target.checked })}
            />
            Use itemized deductions
          </label>
          <label className="flex flex-col gap-1">
            Other joint income
            <input
              type="number"
              value={profile.otherJointIncome}
              onChange={(e) => setProfile({ ...profile, otherJointIncome: Number(e.target.value) })}
              className="rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex flex-col gap-1">
            Itemized federal deductions
            <input
              type="number"
              disabled={!profile.useItemized}
              value={profile.itemizedFederal}
              onChange={(e) => setProfile({ ...profile, itemizedFederal: Number(e.target.value) })}
              className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            Itemized CA deductions
            <input
              type="number"
              disabled={!profile.useItemized}
              value={profile.itemizedCA}
              onChange={(e) => setProfile({ ...profile, itemizedCA: Number(e.target.value) })}
              className="rounded border border-slate-300 px-2 py-1 disabled:bg-slate-100"
            />
          </label>
        </div>
        <button
          onClick={handleSaveProfile}
          disabled={savingProfile}
          className="mt-4 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {savingProfile ? "Saving..." : "Save tax profile"}
        </button>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Earner names</h2>
        <div className="space-y-2">
          {earners.map((e) => (
            <div key={e.id} className="flex items-center gap-2 text-sm">
              <input
                defaultValue={e.name}
                onBlur={(ev) => handleRenameEarner(e.id, ev.target.value)}
                className="w-64 rounded border border-slate-300 px-2 py-1"
              />
              {savingEarner === e.id && <span className="text-xs text-slate-400">Saving...</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Backup</h2>
        <p className="mb-3 text-xs text-slate-500">
          Dumps the SQLite database to iCloud Drive via scripts/backup.sh (also runs nightly via cron).
        </p>
        <button
          onClick={handleBackup}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Run manual backup
        </button>
        {backupStatus && <p className="mt-2 text-sm text-slate-600">{backupStatus}</p>}
      </section>
    </div>
  );
}

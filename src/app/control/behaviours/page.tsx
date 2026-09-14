"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface Behaviour {
  behavior_id: string;
  name: string;
  event_type: string;
  rule: { amount_gte?: number };
  description: string;
  status: string;
}

const EVENT_TYPES = ["RECHARGE", "PACKAGE_PURCHASE", "RENEWAL", "REFERRAL", "SIGNUP", "PARTNER_PURCHASE"];

export default function BehavioursPage() {
  const [behaviours, setBehaviours] = useState<Behaviour[] | null>(null);
  const [form, setForm] = useState({ name: "", event_type: "RECHARGE", amount_gte: "", description: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ behaviours: Behaviour[] }>("/admin/behaviours", { method: "GET" })
      .then((d) => setBehaviours(d.behaviours))
      .catch(() => setBehaviours([]));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/admin/behaviours", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          event_type: form.event_type,
          amount_gte: form.amount_gte ? Number(form.amount_gte) : undefined,
          description: form.description,
        }),
      });
      setForm({ name: "", event_type: "RECHARGE", amount_gte: "", description: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create behaviour.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Behaviours</h1>
      <p className="mt-1 text-sm text-slate-400">
        Reusable, configurable qualifying rules — never hard-coded into a UI component or a single campaign. The same
        behaviour can back many campaigns over time.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Event Type</th>
              <th className="px-4 py-3 font-semibold">Rule</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {behaviours === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              behaviours.map((b) => (
                <tr key={b.behavior_id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{b.behavior_id}</td>
                  <td className="px-4 py-3 font-semibold text-white">{b.name}</td>
                  <td className="px-4 py-3 text-slate-400">{b.event_type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {b.rule.amount_gte !== undefined ? `amount >= ${b.rule.amount_gte}` : "any"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Create Behaviour</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            required
            placeholder="Name (e.g. Recharge OMR 10+)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="admin-input col-span-2"
          />
          <select
            value={form.event_type}
            onChange={(e) => setForm((f) => ({ ...f, event_type: e.target.value }))}
            className="admin-select"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Minimum amount (optional)"
            value={form.amount_gte}
            onChange={(e) => setForm((f) => ({ ...f, amount_gte: e.target.value }))}
            className="admin-input"
          />
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="admin-input col-span-2"
            rows={2}
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-full bg-atharx-teal px-5 py-2.5 text-sm font-bold text-atharx-ink disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create Behaviour"}
        </button>
      </form>
    </div>
  );
}

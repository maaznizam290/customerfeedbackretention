"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface Enterprise {
  enterprise_id: string;
  name: string;
  industry: string;
  country: string;
  status: string;
}

export default function EnterprisesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[] | null>(null);
  const [form, setForm] = useState({ enterprise_id: "", name: "", industry: "", country: "Oman" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ enterprises: Enterprise[] }>("/admin/enterprises", { method: "GET" })
      .then((d) => setEnterprises(d.enterprises))
      .catch(() => setEnterprises([]));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/admin/enterprises", { method: "POST", body: JSON.stringify(form) });
      setForm({ enterprise_id: "", name: "", industry: "", country: "Oman" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create enterprise.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Enterprises</h1>
      <p className="mt-1 text-sm text-slate-400">
        ATHARX is enterprise-agnostic by design — Omantel is simply the first Enterprise record. A bank, airline or
        retailer could be onboarded the same way.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Industry</th>
              <th className="px-4 py-3 font-semibold">Country</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {enterprises === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              enterprises.map((e) => (
                <tr key={e.enterprise_id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{e.enterprise_id}</td>
                  <td className="px-4 py-3 font-semibold text-white">{e.name}</td>
                  <td className="px-4 py-3 text-slate-400">{e.industry}</td>
                  <td className="px-4 py-3 text-slate-400">{e.country}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Add Enterprise (Phase 2 preview)</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input
            required
            placeholder="ID (e.g. BNK)"
            value={form.enterprise_id}
            onChange={(e) => setForm((f) => ({ ...f, enterprise_id: e.target.value }))}
            className="admin-input"
          />
          <input
            required
            placeholder="Industry"
            value={form.industry}
            onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
            className="admin-input"
          />
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="admin-input col-span-2"
          />
          <input
            required
            placeholder="Country"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            className="admin-input col-span-2"
          />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-full bg-atharx-teal px-5 py-2.5 text-sm font-bold text-atharx-ink disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create Enterprise"}
        </button>
      </form>
    </div>
  );
}

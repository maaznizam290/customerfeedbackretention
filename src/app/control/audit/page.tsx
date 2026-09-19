"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface AuditEntry {
  audit_id: string;
  event_type: string;
  enterprise_id: string | null;
  campaign_id: string | null;
  customer_id: string | null;
  token_id: string | null;
  actor: string;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  created_at: string;
}

const EVENT_TYPES = [
  "CAMPAIGN_CREATED",
  "CAMPAIGN_STATUS_CHANGED",
  "EVENT_RECEIVED",
  "EVENT_REJECTED",
  "TOKEN_ISSUED",
  "TOKEN_HELD",
  "TOKEN_RELEASED",
  "TOKEN_CANCELLED",
  "ELIGIBLE_POOL_LOCKED",
  "SELECTION_STARTED",
  "WINNER_SELECTED",
  "WINNER_REVALIDATION_FAILED",
  "ALTERNATE_SELECTED",
];

const EVENT_COLORS: Record<string, string> = {
  EVENT_REJECTED: "bg-slate-500/10 text-slate-400",
  WINNER_REVALIDATION_FAILED: "bg-red-500/10 text-red-400",
  ALTERNATE_SELECTED: "bg-amber-500/10 text-amber-400",
  WINNER_SELECTED: "bg-emerald-500/10 text-emerald-400",
  TOKEN_ISSUED: "bg-sky-500/10 text-sky-400",
  TOKEN_CANCELLED: "bg-red-500/10 text-red-400",
  TOKEN_HELD: "bg-amber-500/10 text-amber-400",
  ELIGIBLE_POOL_LOCKED: "bg-purple-500/10 text-purple-400",
};

export default function AuditLogsPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [filters, setFilters] = useState({ event_type: "", campaign_id: "", customer_id: "" });

  function load() {
    const params = new URLSearchParams();
    if (filters.event_type) params.set("event_type", filters.event_type);
    if (filters.campaign_id) params.set("campaign_id", filters.campaign_id);
    if (filters.customer_id) params.set("customer_id", filters.customer_id);
    apiFetch<{ entries: AuditEntry[] }>(`/admin/audit?${params.toString()}`, { method: "GET" })
      .then((d) => setEntries(d.entries))
      .catch(() => setEntries([]));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Audit Logs</h1>
      <p className="mt-1 text-sm text-slate-400">
        The centralized, timestamped evidence trail (spec §28/§42): every integrity-relevant action — campaign
        lifecycle, event qualification, token issuance, pool locking, selection, and exception management — writes
        exactly one row here. Distinct from product analytics; this is the compliance record.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
        <select
          value={filters.event_type}
          onChange={(e) => setFilters((f) => ({ ...f, event_type: e.target.value }))}
          className="admin-select max-w-[240px]"
        >
          <option value="">Any event type</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="Filter by campaign_id"
          value={filters.campaign_id}
          onChange={(e) => setFilters((f) => ({ ...f, campaign_id: e.target.value }))}
          className="admin-input max-w-[220px]"
        />
        <input
          placeholder="Filter by customer_id"
          value={filters.customer_id}
          onChange={(e) => setFilters((f) => ({ ...f, customer_id: e.target.value }))}
          className="admin-input max-w-[220px]"
        />
        <button type="submit" className="rounded-full bg-atharx-teal px-5 py-2 text-sm font-bold text-atharx-ink">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-semibold">Event</th>
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Customer / Token</th>
              <th className="px-4 py-3 font-semibold">Actor</th>
              <th className="px-4 py-3 font-semibold">Detail</th>
              <th className="px-4 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {entries === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  No audit entries match these filters yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.audit_id} className="border-b border-slate-800/60 last:border-0 align-top">
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${EVENT_COLORS[e.event_type] ?? "bg-slate-800 text-slate-300"}`}
                    >
                      {e.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.campaign_id ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {e.customer_id ?? "—"}
                    {e.token_id && <div className="text-atharx-teal2">{e.token_id}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">{e.actor}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {e.after_value ? JSON.stringify(e.after_value) : e.before_value ? JSON.stringify(e.before_value) : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

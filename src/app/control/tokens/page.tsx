"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface Token {
  token_id: string;
  enterprise_id: string;
  customer_id: string;
  customer_name: string | null;
  campaign_id: string;
  status: string;
  issued_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  ISSUED: "bg-sky-500/10 text-sky-400",
  SELECTED: "bg-emerald-500/10 text-emerald-400",
  EXPIRED: "bg-slate-500/10 text-slate-400",
  CANCELLED: "bg-red-500/10 text-red-400",
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [filters, setFilters] = useState({ campaign_id: "", customer_id: "", status: "" });

  function load() {
    const params = new URLSearchParams();
    if (filters.campaign_id) params.set("campaign_id", filters.campaign_id);
    if (filters.customer_id) params.set("customer_id", filters.customer_id);
    if (filters.status) params.set("status", filters.status);
    apiFetch<{ tokens: Token[] }>(`/admin/tokens?${params.toString()}`, { method: "GET" })
      .then((d) => setTokens(d.tokens))
      .catch(() => setTokens([]));
  }

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Tokens</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every Token is unique, traceable, and generated server-side only — Enterprise → Customer → Behaviour Event →
        Token → Campaign.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
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
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="admin-select max-w-[180px]"
        >
          <option value="">Any status</option>
          {["ISSUED", "SELECTED", "EXPIRED", "CANCELLED"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-atharx-teal px-5 py-2 text-sm font-bold text-atharx-ink">
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-semibold">Token</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Campaign</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Issued</th>
            </tr>
          </thead>
          <tbody>
            {tokens === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : tokens.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No tokens match these filters yet.
                </td>
              </tr>
            ) : (
              tokens.map((t) => (
                <tr key={t.token_id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-atharx-teal2">{t.token_id}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {t.customer_name} <span className="text-slate-500">({t.customer_id})</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.campaign_id}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[t.status] ?? ""}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.issued_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

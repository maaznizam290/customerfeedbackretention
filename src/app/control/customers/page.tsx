"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface Customer {
  customer_id: string;
  full_name: string;
  is_simulated: boolean;
  simulation_id: string | null;
  current_package_id: string | null;
  last_recharge_amount: number | null;
  monthly_spend: number;
  engagement_status: string;
  churn_segment: string | null;
  coin_balance: number;
  token_count: number;
}

const BATCH_SIZES = [100, 1000, 5000, 10000];

const ENGAGEMENT_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-400",
  AT_RISK: "bg-amber-500/10 text-amber-400",
  DORMANT: "bg-red-500/10 text-red-400",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [total, setTotal] = useState(0);
  const [simulatedOnly, setSimulatedOnly] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    apiFetch<{ total: number; customers: Customer[] }>(
      `/admin/customers?limit=50&simulated=${simulatedOnly}`,
      { method: "GET" }
    ).then((d) => {
      setCustomers(d.customers);
      setTotal(d.total);
    });
  }

  useEffect(load, [simulatedOnly]);

  async function generate(count: number) {
    setGenerating(count);
    setMessage(null);
    try {
      const result = await apiFetch<{ simulation_id: string; count: number }>("/admin/customers/simulate", {
        method: "POST",
        body: JSON.stringify({ count }),
      });
      setMessage(`Generated ${result.count} simulated customers (${result.simulation_id}). Clearly demo data.`);
      load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Could not generate customers.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Customers</h1>
      <p className="mt-1 text-sm text-slate-400">
        Simulated prepaid customers ({total.toLocaleString()} shown) reuse the exact same customer/subscriber tables
        as real signups — flagged <code className="text-slate-300">is_simulated</code> — never a parallel fake schema.
        100% demo data; no dependency on any real Omantel customer records.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
        <span className="text-sm font-semibold text-slate-300">Generate simulated customers:</span>
        {BATCH_SIZES.map((size) => (
          <button
            key={size}
            type="button"
            disabled={generating !== null}
            onClick={() => generate(size)}
            className="rounded-full border border-slate-700 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {generating === size ? "Generating…" : `+${size.toLocaleString()}`}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <input type="checkbox" checked={simulatedOnly} onChange={(e) => setSimulatedOnly(e.target.checked)} />
          Simulated only
        </label>
      </div>
      {message && <p className="mt-3 text-sm text-atharx-teal2">{message}</p>}

      <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Package</th>
              <th className="px-4 py-3 font-semibold">Coins</th>
              <th className="px-4 py-3 font-semibold">Tokens</th>
              <th className="px-4 py-3 font-semibold">Engagement</th>
              <th className="px-4 py-3 font-semibold">Churn Segment</th>
            </tr>
          </thead>
          <tbody>
            {customers === null ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.customer_id} className="border-b border-slate-800/60 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">
                      {c.full_name} {c.is_simulated && <span className="ml-1 text-[10px] font-bold text-slate-500">SIM</span>}
                    </p>
                    <p className="font-mono text-xs text-slate-500">{c.customer_id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.current_package_id ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-amber-400">{c.coin_balance}</td>
                  <td className="px-4 py-3 text-slate-300">{c.token_count}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ENGAGEMENT_COLORS[c.engagement_status] ?? ""}`}>
                      {c.engagement_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.churn_segment ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Churn Segment is architecture/future-BI scaffolding only in this MVP — no prediction model runs today.
      </p>
    </div>
  );
}

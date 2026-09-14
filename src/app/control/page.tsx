"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";

interface DashboardStats {
  total_customers: number;
  simulated_customers: number;
  active_campaigns: number;
  tokens_issued_total: number;
  tokens_issued_today: number;
  qualifying_events_today: number;
  coins_distributed_today: number;
}

export default function ControlDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    apiFetch<DashboardStats>("/admin/dashboard", { method: "GET" }).then(setStats).catch(() => setStats(null));
  }, []);

  const tiles = stats
    ? [
        { label: "Total Customers", value: stats.total_customers },
        { label: "Simulated Customers", value: stats.simulated_customers },
        { label: "Active Campaigns", value: stats.active_campaigns },
        { label: "Tokens Issued (Total)", value: stats.tokens_issued_total },
        { label: "Tokens Issued Today", value: stats.tokens_issued_today },
        { label: "Qualifying Events Today", value: stats.qualifying_events_today },
        { label: "Coins Distributed Today", value: stats.coins_distributed_today },
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-400">
        Enterprise Behaviour → Token → Coin → Campaign → Retention, at a glance.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {stats === null
          ? [...Array(7)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-900" />)
          : tiles.map((t) => (
              <div key={t.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-2xl font-black text-white">{t.value.toLocaleString()}</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">{t.label}</p>
              </div>
            ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-400">Demo flow</h2>
        <ol className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-300 sm:grid-cols-2">
          <li>
            1. Review <Link href="/control/enterprises" className="text-atharx-teal2">Enterprises</Link> — Omantel is
            seeded.
          </li>
          <li>
            2. Configure <Link href="/control/behaviours" className="text-atharx-teal2">Behaviours</Link> (e.g.
            Recharge OMR 5+).
          </li>
          <li>
            3. Manage <Link href="/control/campaigns" className="text-atharx-teal2">Campaigns</Link> — activate the F1
            Experience.
          </li>
          <li>
            4. Generate <Link href="/control/customers" className="text-atharx-teal2">Customers</Link> if you need a
            larger simulated base.
          </li>
          <li>
            5. Fire a qualifying event from the <Link href="/control/simulator" className="text-atharx-teal2">Simulator</Link>.
          </li>
          <li>
            6. Close a campaign and run <Link href="/control/selection" className="text-atharx-teal2">Selection</Link>.
          </li>
        </ol>
      </div>
    </div>
  );
}

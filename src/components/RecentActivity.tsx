"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import type { ApiRewardLedgerItem } from "@/types/api";

export function RecentActivity({ limit = 5 }: { limit?: number }) {
  const { session } = useSession();
  const [items, setItems] = useState<ApiRewardLedgerItem[] | null>(null);

  useEffect(() => {
    if (!session.customerId) return;
    apiFetch<{ items: ApiRewardLedgerItem[] }>(`/rewards/ledger/${session.customerId}`, { method: "GET" })
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [session.customerId, session.coinBalance]);

  if (!session.authenticated) return null;

  return (
    <div className="rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card">
      <h3 className="text-lg font-black text-atharx-navy">Recent Reward Activity</h3>
      {items === null ? (
        <div className="mt-4 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-atharx-cloud" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-atharx-navy/50">No reward activity yet. Subscribe or spin to start earning Coins.</p>
      ) : (
        <ul className="mt-4 divide-y divide-atharx-navy/5">
          {items.slice(0, limit).map((item) => (
            <li key={item.reward_id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-semibold text-atharx-navy">{item.description}</p>
                <p className="text-xs text-atharx-navy/40">{new Date(item.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">+{item.coins}</p>
                <p
                  className={`text-[11px] font-bold ${
                    item.status === "CREDITED" ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {item.status === "CREDITED" ? "Credited" : item.status === "PENDING" ? "Pending" : item.status}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

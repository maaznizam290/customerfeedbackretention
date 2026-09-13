"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import { CoinBadge } from "@/components/CoinBadge";
import { VipProgressCard } from "@/components/VipProgressCard";
import { SpinTeaserCard } from "@/components/SpinTeaserCard";
import { LuckyDrawTeaserCard } from "@/components/LuckyDrawTeaserCard";
import type { ApiRewardLedgerItem } from "@/types/api";

export default function RewardsPage() {
  const { session, loading } = useSession();
  const { openSignup } = useSignupModal();
  const [items, setItems] = useState<ApiRewardLedgerItem[] | null>(null);

  useEffect(() => {
    if (!session.customerId) return;
    apiFetch<{ items: ApiRewardLedgerItem[] }>(`/rewards/ledger/${session.customerId}`, { method: "GET" })
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
  }, [session.customerId, session.coinBalance]);

  if (loading) return null;

  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-atharx-navy">Sign in to see your Rewards</h1>
        <p className="mt-2 text-atharx-navy/60">Create an ATHARX account to start earning and tracking Coins.</p>
        <button
          type="button"
          onClick={openSignup}
          className="mt-6 rounded-full bg-atharx-navy px-6 py-3 text-sm font-bold text-white shadow-card"
        >
          Create Account
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-atharx-navy to-atharx-navy2 p-8 text-white shadow-card">
        <p className="text-sm font-semibold uppercase tracking-widest text-atharx-teal2">Current Balance</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-5xl font-black">{session.coinBalance}</span>
          <span className="mb-1.5 text-lg font-bold text-white/70">{session.coinBalance === 1 ? "Coin" : "Coins"}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/rewards/vip" className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/20 hover:bg-white/20">
            VIP Progress
          </Link>
          <Link href="/rewards/lucky-draw" className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/20 hover:bg-white/20">
            Lucky Draw
          </Link>
          <Link href="/rewards/spin" className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold ring-1 ring-white/20 hover:bg-white/20">
            Spin & Win
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <VipProgressCard compact />
        <SpinTeaserCard />
        <LuckyDrawTeaserCard />
      </div>

      <div className="mt-8 rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card">
        <h2 className="text-lg font-black text-atharx-navy">Reward Activity</h2>
        {items === null ? (
          <div className="mt-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-atharx-cloud" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-atharx-navy/50">
            No rewards yet. Subscribe to a package, spin the wheel, or join a campaign to start earning Coins.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-atharx-navy/10 text-atharx-navy/40">
                  <th className="py-2 pr-4 font-semibold">Activity</th>
                  <th className="py-2 pr-4 font-semibold">Coins</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.reward_id} className="border-b border-atharx-navy/5 last:border-0">
                    <td className="py-3 pr-4 font-medium text-atharx-navy">{item.description}</td>
                    <td className="py-3 pr-4 font-bold text-emerald-600">+{item.coins}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.status === "CREDITED"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {item.status === "CREDITED" ? "Credited" : item.status === "PENDING" ? "Pending" : item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <CoinBadge amount={session.coinBalance} />
      </div>
    </main>
  );
}

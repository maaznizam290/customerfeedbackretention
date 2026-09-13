"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import type { ApiVipProgress } from "@/types/api";

const STATUS_LABEL: Record<ApiVipProgress["status"], string> = {
  LOCKED: "Keep earning to unlock VIP",
  ALMOST_THERE: "Almost there!",
  ELIGIBLE: "VIP Eligible",
};

export function VipProgressCard({ compact = false }: { compact?: boolean }) {
  const { session } = useSession();
  const [progress, setProgress] = useState<ApiVipProgress | null>(null);

  useEffect(() => {
    if (!session.customerId) return;
    apiFetch<ApiVipProgress>(`/rewards/vip/${session.customerId}`, { method: "GET" })
      .then(setProgress)
      .catch(() => setProgress(null));
  }, [session.customerId, session.coinBalance]);

  if (!session.authenticated || !progress) return null;

  return (
    <div className="rounded-3xl border border-atharx-navy/10 bg-gradient-to-br from-atharx-navy to-atharx-navy2 p-6 text-white shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-widest text-atharx-teal2">VIP Reward</p>
        <span className="text-sm">🪙 {progress.required_coins} Coins</span>
      </div>
      <h3 className="mt-1 text-xl font-black">Unlock your VIP experience</h3>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs font-semibold text-white/70">
          <span>{progress.balance} / {progress.required_coins} Coins</span>
          <span>{STATUS_LABEL[progress.status]}</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-atharx-gold to-atharx-teal2 transition-all duration-700"
            style={{ width: `${progress.progress_percent}%` }}
          />
        </div>
        {progress.status !== "ELIGIBLE" && (
          <p className="mt-2 text-xs text-white/60">{progress.coins_remaining} Coins remaining</p>
        )}
      </div>

      {!compact && (
        <p className="mt-3 text-xs text-white/50">
          Reach {progress.required_coins} Coins to become eligible for an exclusive VIP experience, such as a luxury
          hotel stay or VIP trip. Eligibility unlocked at {progress.required_coins} Coins.
        </p>
      )}

      <Link
        href="/rewards/vip"
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white/10 py-2.5 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
      >
        View VIP Reward
      </Link>
    </div>
  );
}

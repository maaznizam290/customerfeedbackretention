"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import type { ApiVipProgress } from "@/types/api";

export default function VipPage() {
  const { session, loading: sessionLoading } = useSession();
  const { openSignup } = useSignupModal();
  const [progress, setProgress] = useState<ApiVipProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.customerId) return;
    setLoading(true);
    apiFetch<ApiVipProgress>(`/rewards/vip/${session.customerId}`, { method: "GET" })
      .then(setProgress)
      .catch(() => setProgress(null))
      .finally(() => setLoading(false));
  }, [session.customerId, session.coinBalance]);

  if (sessionLoading) return null;

  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-atharx-navy">VIP Experience</h1>
        <p className="mt-2 text-atharx-navy/60">Create an ATHARX account to start your journey toward VIP.</p>
        <button type="button" onClick={openSignup} className="mt-6 rounded-full bg-atharx-navy px-6 py-3 text-sm font-bold text-white shadow-card">
          Create Account
        </button>
      </main>
    );
  }

  if (loading || !progress) {
    return <main className="mx-auto max-w-2xl px-4 py-24"><div className="h-64 animate-pulse rounded-3xl bg-white/60" /></main>;
  }

  const eligible = progress.status === "ELIGIBLE";

  return (
    <main className="mx-auto max-w-2xl px-4 py-14 sm:px-6 lg:px-8">
      <div className={`rounded-3xl p-8 text-center shadow-card ${eligible ? "bg-gradient-to-br from-amber-400 to-atharx-gold text-atharx-ink" : "bg-white border border-atharx-navy/10"}`}>
        <p className="text-5xl">{eligible ? "🎉" : "🔒"}</p>
        <h1 className={`mt-3 text-2xl font-black ${eligible ? "text-atharx-ink" : "text-atharx-navy"}`}>
          {eligible ? "VIP Experience Unlocked" : "VIP Experience"}
        </h1>
        <p className={`mt-1 text-sm ${eligible ? "text-atharx-ink/70" : "text-atharx-navy/50"}`}>
          {progress.reward_title}
        </p>

        <div className="mt-6">
          <p className={`text-lg font-black ${eligible ? "text-atharx-ink" : "text-atharx-navy"}`}>
            {progress.balance} / {progress.required_coins} Coins
          </p>
          <div className={`mt-2 h-3 w-full overflow-hidden rounded-full ${eligible ? "bg-white/40" : "bg-atharx-cloud"}`}>
            <div
              className={`h-full rounded-full transition-all duration-700 ${eligible ? "bg-atharx-ink" : "bg-gradient-to-r from-atharx-teal to-atharx-navy"}`}
              style={{ width: `${progress.progress_percent}%` }}
            />
          </div>
          {!eligible && (
            <p className="mt-2 text-sm text-atharx-navy/50">
              Earn {progress.required_coins} Coins to unlock eligibility. {progress.coins_remaining} Coins remaining.
            </p>
          )}
        </div>

        <p className={`mt-6 rounded-2xl px-4 py-3 text-sm font-semibold ${eligible ? "bg-white/30 text-atharx-ink" : "bg-atharx-cloud text-atharx-navy/70"}`}>
          {eligible
            ? "You're eligible for an exclusive VIP trip or luxury hotel experience."
            : "Reach 65 Coins to become eligible for an exclusive VIP experience, such as a luxury hotel stay or VIP trip."}
        </p>

        <div className="mt-5">
          <span
            className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest ${
              eligible ? "bg-atharx-ink text-white" : progress.status === "ALMOST_THERE" ? "bg-amber-100 text-amber-700" : "bg-atharx-navy/5 text-atharx-navy/50"
            }`}
          >
            Status: {progress.status === "ELIGIBLE" ? "Eligible" : progress.status === "ALMOST_THERE" ? "Almost There" : "Locked"}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-atharx-navy/10 bg-white p-5 text-xs text-atharx-navy/50">
        <p className="font-bold text-atharx-navy/70">Campaign Terms</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Eligibility requirements apply. Reaching {progress.required_coins} Coins unlocks eligibility, not an automatic prize.</li>
          <li>The specific VIP reward is configured by the campaign administrator and subject to availability.</li>
          <li>VIP travel/hotel rewards are subject to eligibility and fulfillment terms.</li>
        </ul>
      </div>
    </main>
  );
}

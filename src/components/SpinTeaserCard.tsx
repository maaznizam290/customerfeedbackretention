"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";

export function SpinTeaserCard() {
  const { session } = useSession();
  if (!session.authenticated) return null;

  return (
    <div className="rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🎡</span>
        <p className="text-xs font-black uppercase tracking-widest text-atharx-teal">Spin & Win</p>
      </div>
      <h3 className="mt-2 text-xl font-black text-atharx-navy">Complete your daily spin and earn 1 Coin</h3>
      <p className="mt-1.5 text-sm text-atharx-navy/60">Come back every day for another eligible spin.</p>
      <Link
        href="/rewards/spin"
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-atharx-navy py-3 text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
      >
        Spin Now
      </Link>
    </div>
  );
}

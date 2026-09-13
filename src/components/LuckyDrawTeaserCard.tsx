"use client";

import Link from "next/link";
import { useSession } from "@/hooks/useSession";

export function LuckyDrawTeaserCard() {
  const { session } = useSession();
  if (!session.authenticated) return null;

  return (
    <div className="rounded-3xl border border-atharx-navy/10 bg-gradient-to-br from-[#150a2e] to-[#2c1150] p-6 text-white shadow-card">
      <p className="text-xs font-black uppercase tracking-widest text-fuchsia-300">🏆 ATHARX Lucky Draw</p>
      <ul className="mt-3 space-y-1.5 text-sm font-semibold">
        <li>🥇 iPhone 18 Pro Max</li>
        <li>🥈 iPhone 17 Pro Max</li>
        <li>🥉 Apple Watch</li>
      </ul>
      <p className="mt-3 text-[11px] text-white/50">Demo Campaign Rule — Apple is not a sponsor of this campaign.</p>
      <Link
        href="/rewards/lucky-draw"
        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white/10 py-2.5 text-sm font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20"
      >
        View Lucky Draw
      </Link>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import type { ApiLuckyDraw, ApiLuckyDrawEligibility, ApiLuckyDrawWinner, ApiPrize } from "@/types/api";

const PREVIOUS_DRAW_ID = "LD-2026-000";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function LuckyDrawPage() {
  const { session, loading: sessionLoading } = useSession();
  const { openSignup } = useSignupModal();

  const [draw, setDraw] = useState<ApiLuckyDraw | null>(null);
  const [prizes, setPrizes] = useState<ApiPrize[]>([]);
  const [eligibility, setEligibility] = useState<ApiLuckyDrawEligibility | null>(null);
  const [entries, setEntries] = useState<number>(0);
  const [previousWinners, setPreviousWinners] = useState<ApiLuckyDrawWinner[]>([]);
  const [entering, setEntering] = useState(false);
  const [entryMessage, setEntryMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ lucky_draws: ApiLuckyDraw[] }>("/lucky-draws/active", { method: "GET" }).then((data) =>
      setDraw(data.lucky_draws[0] ?? null)
    );
    apiFetch<{ prizes: ApiPrize[] }>("/prizes", { method: "GET" }).then((data) => setPrizes(data.prizes));
    apiFetch<{ winners: ApiLuckyDrawWinner[] }>(`/lucky-draws/${PREVIOUS_DRAW_ID}/winners`, { method: "GET" })
      .then((data) => setPreviousWinners(data.winners))
      .catch(() => setPreviousWinners([]));
  }, []);

  useEffect(() => {
    if (!draw || !session.customerId) return;
    apiFetch<ApiLuckyDrawEligibility>(`/lucky-draws/${draw.lucky_draw_id}/eligibility/${session.customerId}`, {
      method: "GET",
    }).then(setEligibility);
    apiFetch<{ entries: unknown[] }>(`/lucky-draws/${draw.lucky_draw_id}/entries/${session.customerId}`, {
      method: "GET",
    }).then((data) => setEntries(data.entries.length));
  }, [draw, session.customerId, session.coinBalance]);

  async function handleEnter() {
    if (!draw || !session.customerId) return;
    setEntering(true);
    setEntryMessage(null);
    try {
      await apiFetch(`/lucky-draws/${draw.lucky_draw_id}/entries`, {
        method: "POST",
        body: JSON.stringify({ customer_id: session.customerId }),
      });
      setEntries((n) => n + 1);
      setEntryMessage("You're entered! Good luck.");
    } catch (err) {
      setEntryMessage(err instanceof ApiError ? err.message : "Couldn't create an entry right now.");
    } finally {
      setEntering(false);
    }
  }

  const rankedPrizes = prizes.filter((p) => p.rank !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-[#150a2e] to-[#2c1150] p-8 text-center text-white shadow-card">
        <p className="text-xs font-black uppercase tracking-widest text-fuchsia-300">ATHARX Mega Lucky Draw</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Win Big with ATHARX</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          Keep earning Coins and participating in eligible campaigns for your chance to win premium prizes.
        </p>

        <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-3">
          {rankedPrizes.map((p) => (
            <div key={p.prize_id} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-3xl">{RANK_MEDALS[p.rank ?? 0] ?? "🎁"}</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-white/40">
                {p.rank ? `${p.rank === 1 ? "1st" : p.rank === 2 ? "2nd" : "3rd"} Prize` : "Prize"}
              </p>
              <p className="mt-0.5 text-sm font-black">{p.name}</p>
            </div>
          ))}
        </div>
        {draw && (
          <p className="mt-6 text-xs text-white/40">
            Demo Campaign Rule — minimum {draw.minimum_coins} Coins to enter. Draw date{" "}
            {draw.draw_date ? new Date(draw.draw_date).toLocaleDateString() : "TBA"}.
          </p>
        )}
      </div>

      {!sessionLoading && !session.authenticated ? (
        <div className="mt-8 rounded-3xl border border-atharx-navy/10 bg-white p-8 text-center shadow-card">
          <p className="font-bold text-atharx-navy">Create an ATHARX account to track your Lucky Draw eligibility.</p>
          <button type="button" onClick={openSignup} className="mt-4 rounded-full bg-atharx-navy px-6 py-3 text-sm font-bold text-white shadow-card">
            Create Account
          </button>
        </div>
      ) : (
        eligibility && (
          <div className="mt-8 rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card">
            <h2 className="text-lg font-black text-atharx-navy">Your Lucky Draw Status</h2>
            {eligibility.eligible ? (
              <>
                <p className="mt-2 font-bold text-emerald-600">Eligible ✓</p>
                <p className="mt-1 text-sm text-atharx-navy/60">
                  Entries: <span className="font-bold text-atharx-navy">{entries}</span>
                </p>
                {entries === 0 && (
                  <button
                    type="button"
                    onClick={handleEnter}
                    disabled={entering}
                    className="mt-4 rounded-full bg-atharx-navy px-6 py-2.5 text-sm font-bold text-white shadow-card disabled:opacity-60"
                  >
                    {entering ? "Entering..." : "Enter Lucky Draw"}
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="mt-2 font-bold text-atharx-navy/70">🔒 Earn {eligibility.minimum_coins} Coins to become eligible.</p>
                <p className="mt-1 text-sm text-atharx-navy/50">
                  {eligibility.balance} / {eligibility.minimum_coins} Coins
                </p>
              </>
            )}
            {entryMessage && <p className="mt-3 text-sm text-atharx-navy/60">{entryMessage}</p>}
          </div>
        )
      )}

      <div className="mt-8 rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-atharx-navy">Previous ATHARX Lucky Draw</h2>
          <span className="rounded-full bg-atharx-navy/5 px-3 py-1 text-[11px] font-bold text-atharx-navy/50">Demo Data</span>
        </div>
        <ul className="mt-4 space-y-3">
          {previousWinners.map((w) => (
            <li key={w.winner_id} className="flex items-center justify-between rounded-2xl bg-atharx-cloud px-4 py-3 text-sm">
              <span className="font-bold text-atharx-navy">
                {RANK_MEDALS[w.rank] ?? "🎁"} Winner — {w.customer_name}
              </span>
              <span className="text-atharx-navy/60">Prize — {prizes.find((p) => p.prize_id === w.prize_id)?.name ?? w.prize_id}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-atharx-navy/10 bg-white p-5 text-xs text-atharx-navy/50">
        <p className="font-bold text-atharx-navy/70">Campaign Terms</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Eligibility requirements and demo thresholds apply and are configurable by the campaign operator.</li>
          <li>Prizes are subject to campaign availability. Prize models may be subject to change.</li>
          <li>Winner selection is performed server-side and is auditable.</li>
          <li>Apple is not necessarily a sponsor of this campaign.</li>
        </ul>
      </div>
    </main>
  );
}

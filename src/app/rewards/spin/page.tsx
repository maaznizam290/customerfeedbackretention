"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError, newIdempotencyKey } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import { Modal } from "@/components/Modal";
import type { ApiSpinEligibility, ApiSpinResult } from "@/types/api";

// Must stay in the same order as SEGMENT_LABELS in spinService.ts — the
// server returns landed_segment as one of these exact strings, and the
// wheel rotates to whichever index matches it.
const SEGMENTS = ["1 COIN", "2 COINS", "1 COIN", "F1 BONUS", "1 COIN", "3 COINS", "iPHONE BONUS", "5 COINS"];
const SEGMENT_ANGLE = 360 / SEGMENTS.length;
const SEGMENT_COLORS = ["#0B1D3A", "#00C2A8", "#0F2A52", "#F2B705", "#0B1D3A", "#00C2A8", "#F2B705", "#00E0B8"];

function wheelBackground() {
  const stops = SEGMENTS.map((_, i) => {
    const from = i * SEGMENT_ANGLE;
    const to = from + SEGMENT_ANGLE;
    return `${SEGMENT_COLORS[i]} ${from}deg ${to}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export default function SpinPage() {
  const { session, loading: sessionLoading, refresh } = useSession();
  const { openSignup } = useSignupModal();

  const [eligibility, setEligibility] = useState<ApiSpinEligibility | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<ApiSpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(newIdempotencyKey("SPIN-REQ"));

  const loadEligibility = useCallback(async () => {
    if (!session.customerId) return;
    try {
      const data = await apiFetch<ApiSpinEligibility>(`/spin/eligibility/${session.customerId}`, { method: "GET" });
      setEligibility(data);
    } catch {
      setEligibility(null);
    }
  }, [session.customerId]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  async function handleSpin() {
    if (!session.customerId || spinning) return;
    setSpinning(true);
    setError(null);
    try {
      const data = await apiFetch<ApiSpinResult>("/spin", {
        method: "POST",
        body: JSON.stringify({
          customer_id: session.customerId,
          idempotency_key: idempotencyKeyRef.current,
        }),
      });

      const segmentIndex = Math.max(0, SEGMENTS.indexOf(data.landed_segment));
      const targetCenter = segmentIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      const extraSpins = 5 * 360;
      const nextRotation = rotation - (rotation % 360) + extraSpins + (360 - targetCenter);
      setRotation(nextRotation);

      setTimeout(async () => {
        setSpinning(false);
        setResult(data);
        idempotencyKeyRef.current = newIdempotencyKey("SPIN-REQ");
        await refresh();
        await loadEligibility();
      }, 3600);
    } catch (err) {
      setSpinning(false);
      setError(err instanceof ApiError ? err.message : "We couldn't complete your spin right now. Please try again.");
    }
  }

  if (sessionLoading) return null;

  if (!session.authenticated) {
    return (
      <main className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-2xl font-black text-atharx-navy">Spin & Win</h1>
        <p className="mt-2 text-atharx-navy/60">Create an ATHARX account to unlock your daily spin.</p>
        <button type="button" onClick={openSignup} className="mt-6 rounded-full bg-atharx-navy px-6 py-3 text-sm font-bold text-white shadow-card">
          Create Account
        </button>
      </main>
    );
  }

  const eligible = eligibility?.eligible && !spinning;

  return (
    <main className="mx-auto max-w-xl px-4 py-14 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-black text-atharx-navy">🎡 Spin & Win</h1>
      <p className="mt-1 text-sm text-atharx-navy/60">Spin anytime and earn 1–10 Coins.</p>
      <p className="mt-3 text-lg font-bold text-atharx-navy">🪙 {session.coinBalance} Coins</p>

      <div className="relative mx-auto mt-10 flex h-[420px] w-[420px] items-center justify-center">
        <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 text-4xl">🔻</div>
        <div
          className="h-[380px] w-[380px] rounded-full border-[8px] border-white shadow-2xl transition-transform"
          style={{
            background: wheelBackground(),
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? "3.5s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.16, 0.99)",
          }}
        >
          {SEGMENTS.map((label, i) => {
            const spokeAngle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
            // Labels on the bottom half of the wheel point "outward" toward
            // the rim just like the top half, which reads upside-down to the
            // viewer — flip those 180° so every segment stays legible.
            const upsideDown = spokeAngle > 90 && spokeAngle < 270;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 h-1/2 origin-top text-[13px] font-black leading-tight text-white"
                style={{ transform: `rotate(${spokeAngle}deg)` }}
              >
                <span
                  className="absolute left-1/2 top-[95px] w-20 text-center"
                  style={{ transform: `translateX(-50%) rotate(${upsideDown ? 180 : 0}deg)` }}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleSpin}
          disabled={!eligible}
          className="absolute flex h-28 w-28 items-center justify-center rounded-full bg-white text-base font-black text-atharx-navy shadow-xl transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {spinning ? "Spinning..." : "SPIN"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="mt-8 rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card text-left">
        <p className="font-black text-emerald-600">✓ Spin Available</p>
        <p className="mt-1 text-sm text-atharx-navy/60">Today&apos;s Reward: 1–10 Coins — spin to reveal it</p>
      </div>

      <div className="mt-6 rounded-2xl border border-atharx-navy/10 bg-white p-5 text-left text-sm text-atharx-navy/60">
        <p className="font-bold text-atharx-navy">How Spin &amp; Win works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>Spin anytime — there&apos;s no waiting period in this demo.</li>
          <li>Complete the spin to earn 1–10 Coins, depending on the wheel segment.</li>
          <li>F1/iPhone-themed segments are bonus Coin jackpots, not an instant physical prize — those are awarded exclusively through the audited Lucky Draw.</li>
          <li>Your Coin is added automatically to your ATHARX balance.</li>
          <li>Campaign eligibility and terms apply.</li>
        </ol>
      </div>

      {result && (
        <SpinResultModal result={result} onClose={() => setResult(null)} />
      )}
    </main>
  );
}

function SpinResultModal({ result, onClose }: { result: ApiSpinResult; onClose: () => void }) {
  return (
    <Modal isOpen={!!result} onClose={onClose} maxWidthClassName="max-w-sm" hideCloseButton>
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-4xl">🎉</div>
        <h2 className="mt-3 text-xl font-black text-atharx-navy">Congratulations!</h2>
        <p className="mt-1 text-sm text-atharx-navy/60">
          You landed on {result.landed_segment} — +{result.reward.amount} {result.reward.amount === 1 ? "Coin" : "Coins"} earned!
        </p>
        <p className="mt-3 text-2xl font-black text-amber-600">
          🪙 +{result.reward.amount} {result.reward.amount === 1 ? "Coin" : "Coins"}
        </p>
        <p className="mt-3 rounded-2xl bg-atharx-cloud px-4 py-3 text-sm font-bold text-atharx-navy">
          Your Coin balance is now {result.coin_balance}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-atharx-navy py-3 text-sm font-bold text-white shadow-card"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

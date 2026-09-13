"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, ApiError, newIdempotencyKey } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import { Modal } from "@/components/Modal";
import type { ApiSpinEligibility, ApiSpinResult } from "@/types/api";

const SEGMENTS = ["COIN", "BONUS", "LUCKY", "REWARD", "COIN", "BONUS", "SPECIAL", "COIN"];
const SEGMENT_ANGLE = 360 / SEGMENTS.length;
const SEGMENT_COLORS = ["#0B1D3A", "#00C2A8", "#0F2A52", "#00E0B8", "#0B1D3A", "#00C2A8", "#F2B705", "#0B1D3A"];

function wheelBackground() {
  const stops = SEGMENTS.map((_, i) => {
    const from = i * SEGMENT_ANGLE;
    const to = from + SEGMENT_ANGLE;
    return `${SEGMENT_COLORS[i]} ${from}deg ${to}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function SpinPage() {
  const { session, loading: sessionLoading, refresh } = useSession();
  const { openSignup } = useSignupModal();

  const [eligibility, setEligibility] = useState<ApiSpinEligibility | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<ApiSpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const idempotencyKeyRef = useRef(newIdempotencyKey("SPIN-REQ"));

  const loadEligibility = useCallback(async () => {
    if (!session.customerId) return;
    try {
      const data = await apiFetch<ApiSpinEligibility>(`/spin/eligibility/${session.customerId}`, { method: "GET" });
      setEligibility(data);
      setRemainingSeconds(data.remaining_cooldown_seconds);
    } catch {
      setEligibility(null);
    }
  }, [session.customerId]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  useEffect(() => {
    if (!eligibility?.cooldown_active || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((s) => {
        if (s <= 1) {
          clearInterval(timer);
          loadEligibility();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [eligibility?.cooldown_active, remainingSeconds, loadEligibility]);

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
      <p className="mt-1 text-sm text-atharx-navy/60">Complete your daily spin and earn 1 Coin.</p>
      <p className="mt-3 text-lg font-bold text-atharx-navy">🪙 {session.coinBalance} Coins</p>

      <div className="relative mx-auto mt-10 flex h-72 w-72 items-center justify-center">
        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 text-3xl">🔻</div>
        <div
          className="h-64 w-64 rounded-full border-[6px] border-white shadow-2xl transition-transform"
          style={{
            background: wheelBackground(),
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? "3.5s" : "0s",
            transitionTimingFunction: "cubic-bezier(0.17, 0.67, 0.16, 0.99)",
          }}
        >
          {SEGMENTS.map((label, i) => (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 h-1/2 origin-top text-[11px] font-black text-white"
              style={{ transform: `rotate(${i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}deg)` }}
            >
              <span className="absolute left-1/2 top-4 -translate-x-1/2">{label}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={handleSpin}
          disabled={!eligible}
          className="absolute flex h-20 w-20 items-center justify-center rounded-full bg-white text-sm font-black text-atharx-navy shadow-xl transition disabled:cursor-not-allowed disabled:opacity-70"
        >
          {spinning ? "Spinning..." : "SPIN"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      <div className="mt-8 rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card text-left">
        {eligibility?.cooldown_active ? (
          <>
            <p className="font-black text-atharx-navy">⏳ Spin Locked</p>
            <p className="mt-1 text-sm text-atharx-navy/60">
              Next spin available in: <span className="font-bold text-atharx-navy">{formatCountdown(remainingSeconds)}</span>
            </p>
            <p className="mt-1 text-xs text-atharx-navy/40">Come back when the timer reaches zero.</p>
          </>
        ) : (
          <>
            <p className="font-black text-emerald-600">✓ Spin Available</p>
            <p className="mt-1 text-sm text-atharx-navy/60">Today&apos;s Reward: +1 Coin</p>
          </>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-atharx-navy/10 bg-white p-5 text-left text-sm text-atharx-navy/60">
        <p className="font-bold text-atharx-navy">How Spin &amp; Win works</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4">
          <li>You receive one eligible spin per day.</li>
          <li>Complete the spin to earn 1 Coin.</li>
          <li>Your Coin is added automatically to your ATHARX balance.</li>
          <li>Return after 24 hours for another eligible spin.</li>
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
          You landed on {result.landed_segment} — +{result.reward.amount} Coin earned!
        </p>
        <p className="mt-3 text-2xl font-black text-amber-600">🪙 +{result.reward.amount} Coin</p>
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

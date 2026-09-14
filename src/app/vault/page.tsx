"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import type { ApiVaultOffer, ApiVaultRedeemResult, ApiVaultRedemption } from "@/types/api";

const CATEGORY_ORDER: { key: ApiVaultOffer["category"]; label: string; blurb: string }[] = [
  { key: "RESTAURANT", label: "Restaurants", blurb: "Dine out across Oman for less." },
  { key: "HOTEL", label: "Hotels & Resorts", blurb: "Staycations and getaways at partner properties." },
  { key: "PARK", label: "Parks & Attractions", blurb: "Family days out, on a discount." },
  { key: "EXPERIENCE", label: "Premium Experiences", blurb: "Bigger-ticket experiences for your biggest Coin balances." },
];

export default function VaultPage() {
  const { session, loading: sessionLoading, refresh } = useSession();
  const { openSignup } = useSignupModal();

  const [offers, setOffers] = useState<ApiVaultOffer[] | null>(null);
  const [redemptions, setRedemptions] = useState<Record<string, ApiVaultRedemption>>({});
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ offers: ApiVaultOffer[] }>("/vault", { method: "GET" })
      .then((data) => setOffers(data.offers))
      .catch(() => setOffers([]));
  }, []);

  useEffect(() => {
    if (!session.customerId) {
      setRedemptions({});
      return;
    }
    apiFetch<{ redemptions: ApiVaultRedemption[] }>(`/vault/redemptions/${session.customerId}`, { method: "GET" })
      .then((data) => {
        const byOffer: Record<string, ApiVaultRedemption> = {};
        for (const r of data.redemptions) byOffer[r.offer_id] = r;
        setRedemptions(byOffer);
      })
      .catch(() => setRedemptions({}));
  }, [session.customerId]);

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((c) => ({
        ...c,
        offers: (offers ?? []).filter((o) => o.category === c.key),
      })).filter((c) => c.offers.length > 0),
    [offers]
  );

  async function handleRedeem(offer: ApiVaultOffer) {
    if (!session.authenticated) {
      openSignup();
      return;
    }
    setError(null);
    setRedeemingId(offer.offer_id);
    try {
      const result = await apiFetch<ApiVaultRedeemResult>(`/vault/${offer.offer_id}/redeem`, {
        method: "POST",
        body: JSON.stringify({ customer_id: session.customerId }),
      });
      setRedemptions((prev) => ({
        ...prev,
        [offer.offer_id]: {
          redemption_id: result.redemption_id,
          offer_id: result.offer_id,
          coins_spent: result.coins_spent,
          voucher_code: result.voucher_code,
          redeemed_at: new Date().toISOString(),
        },
      }));
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't unlock this offer right now. Please try again.");
    } finally {
      setRedeemingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-to-br from-[#0b3d33] to-atharx-teal p-8 text-center text-white shadow-card">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-200">ATHARX Vault</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Unlock Oman, One Coin at a Time</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-white/70">
          Spend the Coins you&apos;ve earned to unlock 20–50% off restaurants, hotels, parks, and premium experiences
          across Oman. Tap any card to see what it takes to unlock it.
        </p>
        {!sessionLoading && !session.authenticated ? (
          <button
            type="button"
            onClick={openSignup}
            className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-atharx-navy shadow-card"
          >
            Create Account to Start Unlocking
          </button>
        ) : (
          <p className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-bold ring-1 ring-white/20">
            🪙 {session.coinBalance} Coins available
          </p>
        )}
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {offers === null ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-white/60" />
          ))}
        </div>
      ) : (
        grouped.map((section) => (
          <div key={section.key} className="mt-12">
            <h2 className="text-2xl font-black text-atharx-navy">{section.label}</h2>
            <p className="mt-1 text-sm text-atharx-navy/50">{section.blurb}</p>
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {section.offers.map((offer) => (
                <VaultCard
                  key={offer.offer_id}
                  offer={offer}
                  redemption={redemptions[offer.offer_id]}
                  redeeming={redeemingId === offer.offer_id}
                  balance={session.coinBalance}
                  authenticated={session.authenticated}
                  onRedeem={() => handleRedeem(offer)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <div className="mt-12 rounded-2xl border border-atharx-navy/10 bg-white p-5 text-xs text-atharx-navy/50">
        <p className="font-bold text-atharx-navy/70">Vault Terms</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>All Vault partners, discount percentages, and Coin costs shown here are demo/sandbox data for this prototype — not live commercial partnerships.</li>
          <li>Premium Experience listings (e.g. F1/motorsport-themed) are inspired by real attractions but do not imply sponsorship or endorsement by any named brand.</li>
          <li>Each offer can be unlocked once per customer; unlocking spends Coins from your balance immediately and cannot be undone.</li>
          <li>A configured campaign operator can add, retire, or reprice Vault offers at any time.</li>
        </ul>
      </div>
    </main>
  );
}

const SKIP_WORDS = new Set(["the", "a", "an", "al", "of", "at", "by", "&"]);

function monogramFor(name: string): string {
  const words = name
    .replace(/[,–—-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !SKIP_WORDS.has(w.toLowerCase()));
  const letters = words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return letters || name.slice(0, 2).toUpperCase();
}

const BADGE_COLORS = [
  "bg-fuchsia-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
];

function badgeColorFor(offerId: string): string {
  let hash = 0;
  for (let i = 0; i < offerId.length; i++) hash = (hash * 31 + offerId.charCodeAt(i)) >>> 0;
  return BADGE_COLORS[hash % BADGE_COLORS.length];
}

function VaultCard({
  offer,
  redemption,
  redeeming,
  balance,
  authenticated,
  onRedeem,
}: {
  offer: ApiVaultOffer;
  redemption?: ApiVaultRedemption;
  redeeming: boolean;
  balance: number;
  authenticated: boolean;
  onRedeem: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const unlocked = !!redemption;
  const canAfford = balance >= offer.coin_cost;

  return (
    <div className="[perspective:1200px]">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((v) => !v)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setFlipped((v) => !v)}
        className="relative h-72 w-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        aria-label={`${offer.partner_name}, ${offer.discount_percent}% off. Tap for unlock details.`}
      >
        {/* Front */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[#3a1f5e] via-[#3d2166] to-[#241040] p-6 text-center shadow-card [backface-visibility:hidden]">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-black text-white shadow-lg ring-4 ring-white/10 ${badgeColorFor(offer.offer_id)}`}
          >
            {monogramFor(offer.partner_name)}
          </span>
          <h3 className="mt-4 text-base font-black leading-tight text-white">{offer.partner_name}</h3>
          <p className="mt-0.5 text-xs font-semibold text-white/50">{offer.city}</p>
          <p className="mt-3 text-lg font-black text-emerald-400">{offer.discount_percent}% Off</p>
          {unlocked && (
            <span className="mt-3 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/30">
              Unlocked ✓
            </span>
          )}
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-white/30">Tap for details</p>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col rounded-3xl bg-gradient-to-br from-[#241040] via-[#3d2166] to-[#3a1f5e] p-5 text-white shadow-card [backface-visibility:hidden]"
          style={{ transform: "rotateY(180deg)" }}
        >
          <h3 className="text-sm font-black leading-tight">{offer.partner_name}</h3>
          <p className="mt-2 line-clamp-2 text-xs text-white/60">{offer.description}</p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
              <p className="text-lg font-black">{offer.coin_cost}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Min. Coins</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
              <p className="text-lg font-black text-emerald-400">{offer.discount_percent}%</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">Discount</p>
            </div>
          </div>

          <div className="mt-auto">
            {unlocked ? (
              <div className="rounded-xl bg-emerald-500/15 px-3 py-2.5 text-center ring-1 ring-emerald-400/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-300">Your Voucher</p>
                <p className="mt-0.5 font-mono text-xs font-black text-emerald-200">{redemption.voucher_code}</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRedeem();
                }}
                disabled={redeeming || (authenticated && !canAfford)}
                className="w-full rounded-full bg-white py-2.5 text-xs font-bold text-atharx-navy shadow-card transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {redeeming
                  ? "Unlocking..."
                  : !authenticated
                    ? "Sign Up to Unlock"
                    : canAfford
                      ? `Unlock for ${offer.coin_cost} Coins`
                      : `Need ${offer.coin_cost - balance} more Coins`}
              </button>
            )}
            {offer.demo_partner && (
              <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-wide text-white/25">
                Demo Partner — sandbox data
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

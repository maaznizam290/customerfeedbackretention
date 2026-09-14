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
          Spend the Coins you&apos;ve earned to unlock 20–30% off restaurants, hotels, parks, and premium experiences
          across Oman.
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

const CATEGORY_ICON_BG: Record<ApiVaultOffer["category"], string> = {
  RESTAURANT: "from-amber-500 to-amber-600",
  HOTEL: "from-atharx-navy to-atharx-navy2",
  PARK: "from-emerald-600 to-atharx-teal",
  EXPERIENCE: "from-atharx-navy to-fuchsia-700",
};

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
  const unlocked = !!redemption;
  const canAfford = balance >= offer.coin_cost;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-atharx-navy/10 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative bg-gradient-to-br ${CATEGORY_ICON_BG[offer.category]} px-6 py-6 text-white`}>
        <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black text-atharx-navy shadow">
          {offer.discount_percent}% OFF
        </span>
        <span className="text-4xl">{offer.icon}</span>
        <h3 className="mt-3 text-lg font-black leading-tight">{offer.partner_name}</h3>
        <p className="text-xs font-semibold text-white/70">{offer.city}</p>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-atharx-navy/60">{offer.description}</p>

        {unlocked ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-center ring-1 ring-emerald-200">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Unlocked — Your Voucher</p>
            <p className="mt-1 font-mono text-sm font-black text-emerald-800">{redemption.voucher_code}</p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-atharx-cloud px-4 py-2.5 text-sm font-bold text-atharx-navy">
              <span>Unlock for</span>
              <span>🪙 {offer.coin_cost} Coins</span>
            </div>
            <button
              type="button"
              onClick={onRedeem}
              disabled={redeeming || (authenticated && !canAfford)}
              className="mt-4 rounded-full bg-atharx-navy py-3 text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {redeeming
                ? "Unlocking..."
                : !authenticated
                  ? "Sign Up to Unlock"
                  : canAfford
                    ? "Unlock Offer"
                    : `Need ${offer.coin_cost - balance} more Coins`}
            </button>
          </>
        )}

        {offer.demo_partner && (
          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-atharx-navy/30">
            Demo Partner — sandbox data
          </p>
        )}
      </div>
    </div>
  );
}

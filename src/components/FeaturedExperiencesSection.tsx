"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { ApiCampaign } from "@/types/api";

const EXPERIENCE_REWARD_TYPES = ["EXPERIENCE", "VIP_EXPERIENCE", "HOTEL_STAY", "TRAVEL", "ATTRACTION", "PRODUCT"];

const REWARD_TYPE_ICON: Record<string, string> = {
  EXPERIENCE: "🏎",
  VIP_EXPERIENCE: "🏨",
  HOTEL_STAY: "🏨",
  TRAVEL: "✈️",
  ATTRACTION: "🏜",
  PRODUCT: "🎁",
};

export function isExperienceCampaign(campaign: ApiCampaign): boolean {
  return EXPERIENCE_REWARD_TYPES.includes(campaign.reward_type);
}

export function FeaturedExperiencesSection() {
  const [campaigns, setCampaigns] = useState<ApiCampaign[] | null>(null);

  useEffect(() => {
    apiFetch<{ campaigns: ApiCampaign[] }>("/campaigns", { method: "GET" })
      .then((data) => setCampaigns(data.campaigns.filter(isExperienceCampaign)))
      .catch(() => setCampaigns([]));
  }, []);

  if (campaigns !== null && campaigns.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black text-atharx-navy sm:text-4xl">Featured Experiences</h2>
        <p className="mx-auto mt-2 max-w-xl text-atharx-navy/60">
          Earn your place through everyday recharges and top-ups — unforgettable experiences, on top of your Coins.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns === null
          ? [...Array(3)].map((_, i) => <div key={i} className="h-72 animate-pulse rounded-3xl bg-white/60" />)
          : campaigns.map((c) => <ExperienceCard key={c.campaign_id} campaign={c} />)}
      </div>
    </section>
  );
}

function ExperienceCard({ campaign }: { campaign: ApiCampaign }) {
  const remaining =
    campaign.token_capacity !== null ? Math.max(campaign.token_capacity - campaign.tokens_issued, 0) : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-atharx-navy/10 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-xl">
      <div className="bg-gradient-to-br from-atharx-navy to-atharx-navy2 px-6 py-8 text-white">
        <span className="text-4xl">{REWARD_TYPE_ICON[campaign.reward_type] ?? "🎁"}</span>
        <h3 className="mt-3 text-xl font-black">{campaign.experience_title ?? campaign.name}</h3>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-atharx-navy/60">{campaign.experience_description ?? campaign.description}</p>
        <p className="mt-2 text-xs text-atharx-navy/40">{campaign.eligibility}</p>

        {remaining !== null && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-atharx-teal/10 px-4 py-2.5 text-sm font-bold text-atharx-teal">
            <span>Entries remaining</span>
            <span>{remaining.toLocaleString()}</span>
          </div>
        )}

        {campaign.reward_coins > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
            <span>Plus earn</span>
            <span>
              +{campaign.reward_coins} {campaign.reward_coins === 1 ? "Coin" : "Coins"}
            </span>
          </div>
        )}

        <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-atharx-navy/30">
          Demo concept — not a confirmed partnership or prize
        </p>

        <a
          href="/rewards"
          className="mt-5 rounded-full bg-atharx-navy py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
        >
          Keep Recharging to Qualify
        </a>
      </div>
    </div>
  );
}

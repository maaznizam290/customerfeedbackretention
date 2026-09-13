"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { CampaignCard } from "@/components/CampaignCard";
import type { ApiCampaign } from "@/types/api";

export function CampaignsSection({ title = true, limit }: { title?: boolean; limit?: number }) {
  const [campaigns, setCampaigns] = useState<ApiCampaign[] | null>(null);

  useEffect(() => {
    apiFetch<{ campaigns: ApiCampaign[] }>("/campaigns", { method: "GET" })
      .then((data) => setCampaigns(data.campaigns))
      .catch(() => setCampaigns([]));
  }, []);

  const shown = limit ? campaigns?.slice(0, limit) : campaigns;

  return (
    <section id="campaigns" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      {title && (
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-atharx-navy sm:text-4xl">ATHARX Campaigns</h2>
          <p className="mx-auto mt-2 max-w-xl text-atharx-navy/60">
            Sign-up bonuses, package rewards, referrals and limited-time offers.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown === undefined || shown === null
          ? [...Array(3)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-white/60" />
            ))
          : shown.map((c) => <CampaignCard key={c.campaign_id} campaign={c} />)}
      </div>
    </section>
  );
}

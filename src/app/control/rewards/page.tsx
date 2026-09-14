"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

interface Campaign {
  campaign_id: string;
  name: string;
  reward_type: string;
  reward_coins: number;
  experience_title: string | null;
  status: string;
}

interface Prize {
  prize_id: string;
  name: string;
  category: string;
  rank: number | null;
}

const CATEGORY_ORDER = ["EXPERIENCE", "VIP_EXPERIENCE", "HOTEL_STAY", "TRAVEL", "ATTRACTION", "PRODUCT", "COIN"];

export default function RewardsCatalogPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);

  useEffect(() => {
    apiFetch<{ campaigns: Campaign[] }>("/admin/campaigns", { method: "GET" }).then((d) => setCampaigns(d.campaigns));
    apiFetch<{ prizes: Prize[] }>("/prizes", { method: "GET" }).then((d) => setPrizes(d.prizes));
  }, []);

  const grouped = CATEGORY_ORDER.map((type) => ({
    type,
    items: campaigns.filter((c) => c.reward_type === type),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <h1 className="text-2xl font-black text-white">Reward Catalog</h1>
      <p className="mt-1 text-sm text-slate-400">
        Every reward a campaign can grant, grouped by type. The MVP focuses on COIN, EXPERIENCE, VIP_EXPERIENCE and
        PRODUCT — cashback/discount/voucher types are modeled in the schema for Phase 2.
      </p>

      <div className="mt-6 space-y-6">
        {grouped.map((g) => (
          <div key={g.type} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xs font-black uppercase tracking-wide text-atharx-teal2">{g.type}</h2>
            <ul className="mt-3 space-y-2">
              {g.items.map((c) => (
                <li key={c.campaign_id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-white">{c.experience_title ?? c.name}</span>
                  <span className="text-slate-400">
                    {c.reward_coins > 0 ? `+${c.reward_coins} Coins` : "—"} · {c.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xs font-black uppercase tracking-wide text-atharx-teal2">Lucky Draw Prize Pool</h2>
        <ul className="mt-3 space-y-2">
          {prizes.map((p) => (
            <li key={p.prize_id} className="flex items-center justify-between text-sm">
              <span className="font-semibold text-white">{p.name}</span>
              <span className="text-slate-400">{p.rank ? `Rank ${p.rank}` : p.category}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

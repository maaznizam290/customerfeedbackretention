import { Tag } from "lucide-react";
import type { ApiCampaign } from "@/types/api";

const CATEGORY_LABELS: Record<string, string> = {
  SIGNUP: "Claim Reward",
  PACKAGE_SUBSCRIPTION: "Browse Packages",
  REFERRAL_SUCCESS: "Invite Friends",
  RECHARGE_THRESHOLD: "Recharge Now",
  GENERAL: "Learn More",
};

export function CampaignCard({ campaign }: { campaign: ApiCampaign }) {
  const cta = CATEGORY_LABELS[campaign.campaign_type] ?? "View Offer";
  const isDemoOnly = campaign.campaign_type === "RECHARGE_THRESHOLD" || campaign.campaign_type === "GENERAL";

  return (
    <div className="flex flex-col rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-atharx-teal/10 px-3 py-1 text-xs font-bold text-atharx-teal">
          <Tag size={12} /> {campaign.category}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
          {campaign.status}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-black text-atharx-navy">{campaign.name}</h3>
      <p className="mt-1.5 text-sm text-atharx-navy/60">{campaign.description}</p>
      <p className="mt-2 text-xs text-atharx-navy/40">{campaign.eligibility}</p>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
        <span>Earn</span>
        <span>+{campaign.reward_coins} {campaign.reward_coins === 1 ? "Coin" : "Coins"}</span>
      </div>

      {isDemoOnly && (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-atharx-navy/30">
          Demo Campaign Rule — sandbox data
        </p>
      )}

      <a
        href={campaign.campaign_type === "PACKAGE_SUBSCRIPTION" ? "/packages" : "/rewards"}
        className="mt-5 rounded-full bg-atharx-navy py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
      >
        {cta}
      </a>
    </div>
  );
}

import { Signal, Wifi, MessageSquare, CalendarClock } from "lucide-react";
import type { ApiPackage } from "@/types/api";

export function PackageCard({ pkg, onSubscribe }: { pkg: ApiPackage; onSubscribe: (pkg: ApiPackage) => void }) {
  return (
    <div className="group relative flex flex-col rounded-3xl border border-atharx-navy/10 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-xl">
      {pkg.badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-atharx-gold px-3 py-1 text-[11px] font-black uppercase tracking-wide text-atharx-ink shadow">
          {pkg.badge}
        </span>
      )}

      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-black text-atharx-navy">{pkg.name}</h3>
        <span className="text-xs font-mono text-atharx-navy/30">{pkg.package_id}</span>
      </div>
      <p className="mt-1 text-sm text-atharx-navy/50">{pkg.description}</p>

      <div className="mt-4 flex items-end gap-1">
        <span className="text-3xl font-black text-atharx-navy">{pkg.currency} {pkg.price}</span>
        <span className="mb-1 text-xs text-atharx-navy/40">/ {pkg.validity_days} days</span>
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 text-sm text-atharx-navy/70">
        <li className="flex items-center gap-2">
          <Signal size={16} className="text-atharx-teal" /> {pkg.local_minutes.toLocaleString()} min
        </li>
        <li className="flex items-center gap-2">
          <Wifi size={16} className="text-atharx-teal" /> {pkg.data_gb} GB
        </li>
        <li className="flex items-center gap-2">
          <MessageSquare size={16} className="text-atharx-teal" /> {pkg.sms} SMS
        </li>
        <li className="flex items-center gap-2">
          <CalendarClock size={16} className="text-atharx-teal" /> {pkg.validity_days} Days
        </li>
      </ul>

      <div className="mt-5 flex items-center justify-between rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
        <span>Campaign Reward</span>
        <span>+{pkg.campaign_reward_coins} {pkg.campaign_reward_coins === 1 ? "Coin" : "Coins"}</span>
      </div>

      <button
        type="button"
        onClick={() => onSubscribe(pkg)}
        className="mt-5 w-full rounded-full bg-atharx-navy py-3 text-sm font-bold text-white shadow-card transition group-hover:bg-atharx-teal2 group-hover:text-atharx-ink"
      >
        Subscribe
      </button>
    </div>
  );
}

export function PackageCardSkeleton() {
  return (
    <div className="flex flex-col rounded-3xl border border-atharx-navy/10 bg-white p-6">
      <div className="h-5 w-24 animate-pulse rounded bg-atharx-navy/10" />
      <div className="mt-2 h-3 w-40 animate-pulse rounded bg-atharx-navy/10" />
      <div className="mt-6 h-8 w-28 animate-pulse rounded bg-atharx-navy/10" />
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse rounded bg-atharx-navy/10" />
        ))}
      </div>
      <div className="mt-6 h-10 w-full animate-pulse rounded-full bg-atharx-navy/10" />
    </div>
  );
}

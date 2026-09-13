"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import type { SubscribeSuccessData } from "@/components/SubscribeModal";
import type { ApiPackage } from "@/types/api";

export function SubscriptionSuccessModal({
  data,
  pkg,
  onClose,
}: {
  data: SubscribeSuccessData | null;
  pkg: ApiPackage | null;
  onClose: () => void;
}) {
  if (!data || !pkg) return null;

  return (
    <Modal isOpen={!!data} onClose={onClose} maxWidthClassName="max-w-md" hideCloseButton>
      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-atharx-navy">Subscription Successful</h2>
        <p className="mt-1 text-sm text-atharx-navy/60">You&apos;re successfully subscribed.</p>

        <div className="mt-5 w-full space-y-2 rounded-2xl bg-atharx-cloud p-4 text-left text-sm">
          <Row label="Package" value={pkg.name} />
          <Row label="Price" value={`${data.currency} ${data.price}`} />
          <Row label="Validity" value={`${pkg.validity_days} Days`} />
          <Row label="Mobile" value={data.msisdn} />
          <Row label="Subscriber ID" value={data.subscriber_id} mono />
          <Row label="Status" value={data.status} badge="ACTIVE" />
          <Row label="Reward Earned" value={`+${data.reward.coins} Coins`} />
        </div>

        <div className="mt-4 w-full rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
          Your new Coin balance: {data.coin_balance} {data.coin_balance === 1 ? "Coin" : "Coins"}
        </div>

        {data.is_replay && (
          <p className="mt-3 text-xs text-atharx-navy/40">
            This subscription request was already processed — showing your existing subscription.
          </p>
        )}

        <Link
          href="/rewards"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-atharx-navy py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
        >
          View Rewards
        </Link>
        <button type="button" onClick={onClose} className="mt-2 text-sm font-semibold text-atharx-navy/50 hover:text-atharx-navy">
          Close
        </button>
      </div>
    </Modal>
  );
}

function Row({ label, value, mono, badge }: { label: string; value: string; mono?: boolean; badge?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-atharx-navy/50">{label}</span>
      {badge ? (
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{value}</span>
      ) : (
        <span className={`font-bold text-atharx-navy ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
      )}
    </div>
  );
}

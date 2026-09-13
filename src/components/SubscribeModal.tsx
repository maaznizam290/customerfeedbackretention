"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { apiFetch, ApiError, newIdempotencyKey } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import type { ApiPackage } from "@/types/api";

export interface SubscribeSuccessData {
  subscription_id: string;
  subscriber_id: string;
  customer_id: string;
  msisdn: string;
  package_id: string;
  status: string;
  price: number;
  currency: string;
  activated_at: string | null;
  reward: { coins: number; status: string };
  coin_balance: number;
  vip_just_reached: boolean;
  is_replay: boolean;
}

interface SubscribeModalProps {
  pkg: ApiPackage | null;
  onClose: () => void;
  onSuccess: (data: SubscribeSuccessData, pkg: ApiPackage) => void;
}

export function SubscribeModal({ pkg, onClose, onSuccess }: SubscribeModalProps) {
  const { session } = useSession();
  const [consumerName, setConsumerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string>(newIdempotencyKey("REQ"));

  useEffect(() => {
    if (pkg) {
      idempotencyKeyRef.current = newIdempotencyKey("REQ");
      setConsumerName(session.fullName ?? "");
      setMobile(session.subscribers[0]?.msisdn ?? "");
      setError(null);
    }
  }, [pkg, session.fullName, session.subscribers]);

  if (!pkg) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pkg) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<SubscribeSuccessData>("/subscriptions/subscribe", {
        method: "POST",
        body: JSON.stringify({
          customer_name: consumerName,
          msisdn: mobile,
          package_id: pkg.package_id,
          idempotency_key: idempotencyKeyRef.current,
        }),
      });
      onSuccess(data, pkg);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't complete your subscription right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal isOpen={!!pkg} onClose={onClose} title={`Subscribe to ${pkg.name}`} maxWidthClassName="max-w-md">
      <p className="-mt-2 mb-5 text-sm text-atharx-navy/60">Ready to stay connected?</p>

      <div className="mb-5 grid grid-cols-2 gap-3 rounded-2xl bg-atharx-cloud p-4 text-sm">
        <ReadOnlyField label="Package" value={pkg.name} />
        <ReadOnlyField label="Price" value={`${pkg.currency} ${pkg.price}`} />
        <ReadOnlyField label="Validity" value={`${pkg.validity_days} days`} />
        <ReadOnlyField label="Campaign Reward" value={`+${pkg.campaign_reward_coins} Coins`} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="consumerName" className="mb-1.5 block text-sm font-semibold text-atharx-navy">
            Consumer Name
          </label>
          <input
            id="consumerName"
            required
            minLength={2}
            value={consumerName}
            onChange={(e) => setConsumerName(e.target.value)}
            className="atharx-input"
            placeholder="Full name"
          />
        </div>
        <div>
          <label htmlFor="subMobile" className="mb-1.5 block text-sm font-semibold text-atharx-navy">
            Mobile Number
          </label>
          <input
            id="subMobile"
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="atharx-input"
            placeholder="+968 9XXX XXXX"
            inputMode="tel"
          />
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-full bg-gradient-to-r from-atharx-navy to-atharx-teal py-3.5 text-sm font-bold text-white shadow-card transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Subscribing..." : "Subscribe Now"}
        </button>
      </form>
    </Modal>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-atharx-navy/40">{label}</p>
      <p className="font-bold text-atharx-navy">{value}</p>
    </div>
  );
}

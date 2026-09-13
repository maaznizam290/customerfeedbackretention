"use client";

import Link from "next/link";
import { Modal } from "@/components/Modal";

export function VipReachedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-sm" hideCloseButton>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-atharx-gold/30 to-amber-200 text-5xl shadow-glow animate-coin-pop">
          🎉
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-atharx-teal">VIP Unlocked</p>
        <h2 className="mt-1 text-2xl font-black text-atharx-navy">65 Coins achieved!</h2>
        <p className="mt-2 text-sm text-atharx-navy/60">
          You&apos;ve unlocked eligibility for an exclusive VIP experience.
        </p>
        <p className="mt-3 rounded-2xl bg-atharx-cloud px-4 py-3 text-sm font-bold text-atharx-navy">
          VIP Trip / Luxury Hotel Experience
        </p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <Link
            href="/rewards/vip"
            onClick={onClose}
            className="w-full rounded-full bg-atharx-navy py-3 text-center text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
          >
            View VIP Reward
          </Link>
          <button type="button" onClick={onClose} className="w-full rounded-full py-3 text-sm font-bold text-atharx-navy/60 hover:bg-atharx-cloud">
            Later
          </button>
        </div>
      </div>
    </Modal>
  );
}

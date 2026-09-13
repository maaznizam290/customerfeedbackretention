"use client";

import { Modal } from "@/components/Modal";

interface RewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  headline?: string;
  coinsEarned: number;
  newBalance: number;
  supportingText?: string;
  secondaryAction?: { label: string; onClick: () => void };
}

export function RewardModal({
  isOpen,
  onClose,
  headline = "Congratulations!",
  coinsEarned,
  newBalance,
  supportingText = "Use your rewards on eligible ATHARX campaigns and offers.",
  secondaryAction,
}: RewardModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-sm" hideCloseButton>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-5xl shadow-glow animate-coin-pop">
          🪙
        </div>
        <h2 className="text-2xl font-black text-atharx-navy">{headline}</h2>
        <p className="mt-2 text-3xl font-black text-amber-600">
          +{coinsEarned} {coinsEarned === 1 ? "Coin" : "Coins"}
        </p>
        <p className="mt-3 text-sm text-atharx-navy/60">{supportingText}</p>
        <div className="mt-4 w-full rounded-2xl bg-atharx-cloud px-4 py-3 text-sm font-semibold text-atharx-navy">
          Your Coin balance is now <span className="font-black text-atharx-teal">{newBalance}</span>{" "}
          {newBalance === 1 ? "Coin" : "Coins"}
        </div>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-atharx-navy py-3 text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
          >
            OK
          </button>
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="w-full rounded-full py-3 text-sm font-bold text-atharx-navy/70 transition hover:bg-atharx-cloud"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

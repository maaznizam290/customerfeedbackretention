import { spinRepository } from "@/repositories/spinRepository";
import { rewardService } from "@/services/rewardService";
import { getDb } from "@/lib/db";
import { generateSpinId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import type { SpinTransaction } from "@/types";

export class SpinCooldownActiveError extends AppError {
  constructor(nextSpinAvailableAt: string, remainingCooldownSeconds: number) {
    super("Your next spin will be available after 24 hours.", 409, "COOLDOWN_ACTIVE", {
      next_spin_available_at: nextSpinAvailableAt,
      remaining_cooldown_seconds: remainingCooldownSeconds,
    });
  }
}

export class NoActiveSpinCampaignError extends AppError {
  constructor() {
    super("Spin & Win is not currently active.", 503, "NO_ACTIVE_CAMPAIGN");
  }
}

/**
 * The prize table for Spin & Win. Each index pairs a wheel label with the
 * exact Coin amount that landing on it credits — the wheel never shows a
 * number it doesn't pay out. The two "jackpot" segments borrow F1/iPhone
 * theming for excitement, but always resolve to Coins: a real physical or
 * premium prize (iPhone, F1 experience) is only ever granted through the
 * audited Lucky Draw / Selection Engine elsewhere in the app, never as an
 * instant random spin outcome — that would read as a guaranteed-win
 * giveaway, which the responsible-gamification rules for this MVP
 * explicitly rule out. The landed index (and therefore the reward) is
 * chosen server-side only; a client can never influence or pre-see it.
 */
const SEGMENT_LABELS = ["1 COIN", "2 COINS", "1 COIN", "F1 BONUS", "1 COIN", "3 COINS", "iPHONE BONUS", "5 COINS"];
const SEGMENT_REWARDS = [1, 2, 1, 10, 1, 3, 10, 5];

export interface SpinEligibility {
  eligible: boolean;
  campaignId: string | null;
  rewardCoins: number;
  cooldownActive: boolean;
  lastSpinAt: string | null;
  nextSpinAvailableAt: string | null;
  remainingCooldownSeconds: number;
}

export const spinService = {
  getEligibility(customerId: string): SpinEligibility {
    const campaign = spinRepository.findActiveCampaign();
    if (!campaign) {
      return {
        eligible: false,
        campaignId: null,
        rewardCoins: 0,
        cooldownActive: false,
        lastSpinAt: null,
        nextSpinAvailableAt: null,
        remainingCooldownSeconds: 0,
      };
    }

    const last = spinRepository.lastSpinForCustomer(customerId, campaign.spinCampaignId);
    if (!last) {
      return {
        eligible: true,
        campaignId: campaign.spinCampaignId,
        rewardCoins: campaign.rewardCoins,
        cooldownActive: false,
        lastSpinAt: null,
        nextSpinAvailableAt: null,
        remainingCooldownSeconds: 0,
      };
    }

    const now = Date.now();
    const nextAvailable = new Date(last.nextSpinAvailableAt).getTime();
    const cooldownActive = now < nextAvailable;

    return {
      eligible: !cooldownActive,
      campaignId: campaign.spinCampaignId,
      rewardCoins: campaign.rewardCoins,
      cooldownActive,
      lastSpinAt: last.lastSpinAt,
      nextSpinAvailableAt: cooldownActive ? last.nextSpinAvailableAt : null,
      remainingCooldownSeconds: cooldownActive ? Math.ceil((nextAvailable - now) / 1000) : 0,
    };
  },

  /**
   * Executes an eligible spin. Server time is the sole authority for the
   * cooldown check (never a client-supplied timestamp). The entire
   * check-then-write sequence runs inside a synchronous SQLite transaction,
   * which — because better-sqlite3 executes synchronously on Node's single
   * thread — cannot interleave with a concurrent request, closing the
   * double-spin race described in the spec (double-click, retry, multi-tab).
   */
  executeSpin(input: {
    customerId: string;
    subscriberId: string | null;
    idempotencyKey: string;
  }): SpinTransaction {
    const db = getDb();

    const run = db.transaction(() => {
      const existing = spinRepository.findByIdempotencyKey(input.idempotencyKey);
      if (existing) return existing;

      const campaign = spinRepository.findActiveCampaign();
      if (!campaign) throw new NoActiveSpinCampaignError();

      const last = spinRepository.lastSpinForCustomer(input.customerId, campaign.spinCampaignId);
      const now = new Date();
      if (last) {
        const nextAvailable = new Date(last.nextSpinAvailableAt);
        if (now < nextAvailable) {
          const remaining = Math.ceil((nextAvailable.getTime() - now.getTime()) / 1000);
          throw new SpinCooldownActiveError(last.nextSpinAvailableAt, remaining);
        }
      }

      // Server determines both the landed segment AND the reward amount
      // unconditionally; any client-sent reward value is ignored entirely
      // (never read here). The two are drawn from the same index so the
      // credited Coins always match what the wheel visually landed on.
      const landedIndex = Math.floor(Math.random() * SEGMENT_LABELS.length);
      const landedSegment = SEGMENT_LABELS[landedIndex];
      const rewardCoins = SEGMENT_REWARDS[landedIndex];
      const reward = rewardService.creditReward({
        customerId: input.customerId,
        rewardType: "SPIN_REWARD",
        coins: rewardCoins,
        description: "ATHARX Daily Spin Reward",
      });
      const nextSpinAvailableAt = new Date(now.getTime() + campaign.cooldownSeconds * 1000).toISOString();

      return spinRepository.create({
        spinId: generateSpinId(),
        spinCampaignId: campaign.spinCampaignId,
        customerId: input.customerId,
        subscriberId: input.subscriberId,
        rewardCoins,
        rewardId: reward.rewardId,
        idempotencyKey: input.idempotencyKey,
        landedSegment,
        lastSpinAt: now.toISOString(),
        nextSpinAvailableAt,
      });
    });

    return run();
  },

  getHistory(customerId: string): SpinTransaction[] {
    return spinRepository.historyForCustomer(customerId);
  },
};

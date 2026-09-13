import { milestoneRepository } from "@/repositories/milestoneRepository";
import { rewardService } from "@/services/rewardService";
import type { RewardMilestone } from "@/types";

export interface VipProgress {
  milestone: RewardMilestone;
  balance: number;
  requiredCoins: number;
  coinsRemaining: number;
  progressPercent: number;
  status: "LOCKED" | "ALMOST_THERE" | "ELIGIBLE";
}

const ALMOST_THERE_THRESHOLD = 0.75;

/**
 * VIP / milestone progress is always computed from the live Coin balance and
 * a configurable `reward_milestones` record — the 65-Coin threshold is data,
 * not a constant baked into a component (see VIP_COIN_THRESHOLD in .env.example
 * for the seed default only).
 */
export const milestoneService = {
  listActive(): RewardMilestone[] {
    return milestoneRepository.listActive();
  },

  getVipProgress(customerId: string): VipProgress | null {
    const milestone = milestoneRepository
      .listActive()
      .find((m) => m.rewardType === "VIP_EXPERIENCE");
    if (!milestone) return null;

    const balance = rewardService.getBalance(customerId);
    const coinsRemaining = Math.max(milestone.requiredCoins - balance, 0);
    const progressPercent = Math.min(100, Math.round((balance / milestone.requiredCoins) * 100));

    let status: VipProgress["status"] = "LOCKED";
    if (balance >= milestone.requiredCoins) status = "ELIGIBLE";
    else if (balance / milestone.requiredCoins >= ALMOST_THERE_THRESHOLD) status = "ALMOST_THERE";

    return {
      milestone,
      balance,
      requiredCoins: milestone.requiredCoins,
      coinsRemaining,
      progressPercent,
      status,
    };
  },

  /**
   * Returns true the balance has JUST crossed the VIP threshold as of this
   * reward event (balanceBefore < threshold <= balanceAfter), so the caller
   * can decide whether to surface the celebratory unlock moment.
   */
  justReachedVip(balanceBefore: number, balanceAfter: number, requiredCoins: number): boolean {
    return balanceBefore < requiredCoins && balanceAfter >= requiredCoins;
  },
};

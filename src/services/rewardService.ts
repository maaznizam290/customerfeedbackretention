import { rewardRepository } from "@/repositories/rewardRepository";
import { generateRewardId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import type { Reward, RewardType } from "@/types";

export class DuplicateSignupRewardError extends AppError {
  constructor() {
    super("Signup reward has already been credited for this customer.", 409, "DUPLICATE_SIGNUP_REWARD");
  }
}

/**
 * Central reward ledger service. Every Coin credited anywhere in ATHARX
 * (signup, subscription, campaigns, spin) must go through here so the
 * ledger stays the single source of truth and the balance is always a
 * derived aggregate (Rule 5 & 6), never a value mutated in place.
 */
export const rewardService = {
  creditSignupReward(customerId: string): Reward {
    if (rewardRepository.hasSignupReward(customerId)) {
      throw new DuplicateSignupRewardError();
    }
    return rewardRepository.create({
      rewardId: generateRewardId(),
      customerId,
      subscriptionId: null,
      rewardType: "SIGNUP_REWARD",
      coins: 1,
      description: "ATHARX Signup Reward",
    });
  },

  creditReward(input: {
    customerId: string;
    subscriptionId?: string | null;
    rewardType: RewardType;
    coins: number;
    description: string;
    status?: Reward["status"];
  }): Reward {
    return rewardRepository.create({
      rewardId: generateRewardId(),
      customerId: input.customerId,
      subscriptionId: input.subscriptionId ?? null,
      rewardType: input.rewardType,
      coins: input.coins,
      description: input.description,
      status: input.status,
    });
  },

  getBalance(customerId: string): number {
    return rewardRepository.balanceForCustomer(customerId);
  },

  getLedger(customerId: string): Reward[] {
    return rewardRepository.ledgerForCustomer(customerId);
  },
};

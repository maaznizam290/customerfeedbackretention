import { campaignRepository } from "@/repositories/campaignRepository";
import type { Campaign, CampaignType } from "@/types";

/**
 * The campaign engine. Reward amounts for any business event (subscription,
 * referral, recharge, partner purchase, ...) are resolved here, driven by
 * configurable `campaigns` records, rather than being hard-coded in UI
 * components (Rule 4). A future admin portal can change these rows without
 * any frontend redeploy.
 */
export const campaignService = {
  listActive(): Campaign[] {
    return campaignRepository.listActive();
  },

  listAll(): Campaign[] {
    return campaignRepository.listAll();
  },

  /** Resolves the Coin reward for subscribing to a given package. */
  getSubscriptionReward(packageId: string, fallbackCoins: number): number {
    const campaign = campaignRepository.findActiveByPackageAndType(packageId, "PACKAGE_SUBSCRIPTION");
    return campaign ? campaign.rewardCoins : fallbackCoins;
  },

  getRewardForType(campaignType: CampaignType, fallbackCoins = 0): number {
    const campaign = campaignRepository.findActiveByType(campaignType);
    return campaign ? campaign.rewardCoins : fallbackCoins;
  },
};

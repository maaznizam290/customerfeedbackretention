import { describe, expect, it, beforeAll } from "vitest";
import { campaignService } from "@/services/campaignService";
import { milestoneService } from "@/services/milestoneService";
import { rewardService } from "@/services/rewardService";
import { customerRepository } from "@/repositories/customerRepository";
import { generateCustomerId } from "@/lib/ids";
import {
  seedGoldCampaign,
  seedGoldPackage,
  seedOmantelEnterprise,
  seedPackagePurchaseBehaviour,
  seedVipMilestone,
} from "../helpers/seedFixtures";

function makeCustomer() {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Test Customer",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  return customerId;
}

beforeAll(() => {
  seedOmantelEnterprise();
  seedPackagePurchaseBehaviour();
  seedGoldPackage();
  seedGoldCampaign();
  seedVipMilestone(65);
});

describe("campaignService (campaign engine)", () => {
  it("resolves the subscription reward from the configured campaign, not a hard-coded value (Rule 4)", () => {
    expect(campaignService.getSubscriptionReward("OMT-GOLD-05", 999)).toBe(2);
  });

  it("falls back to the package's own reward when no campaign is configured", () => {
    expect(campaignService.getSubscriptionReward("OMT-UNKNOWN", 7)).toBe(7);
  });
});

describe("milestoneService (VIP progress)", () => {
  it("reports LOCKED with correct progress percent below the threshold", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 13, description: "seed" });
    const progress = milestoneService.getVipProgress(customerId)!;
    expect(progress.requiredCoins).toBe(65);
    expect(progress.balance).toBe(13);
    expect(progress.coinsRemaining).toBe(52);
    expect(progress.progressPercent).toBe(20);
    expect(progress.status).toBe("LOCKED");
  });

  it("reports ALMOST_THERE at or above 75% of the threshold", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 50, description: "seed" });
    expect(milestoneService.getVipProgress(customerId)!.status).toBe("ALMOST_THERE");
  });

  it("reports ELIGIBLE once the balance reaches the required Coins", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 65, description: "seed" });
    const progress = milestoneService.getVipProgress(customerId)!;
    expect(progress.status).toBe("ELIGIBLE");
    expect(progress.coinsRemaining).toBe(0);
  });

  it("detects crossing the threshold exactly at the moment of a reward (for the celebratory modal)", () => {
    expect(milestoneService.justReachedVip(63, 65, 65)).toBe(true);
    expect(milestoneService.justReachedVip(65, 66, 65)).toBe(false);
    expect(milestoneService.justReachedVip(10, 12, 65)).toBe(false);
  });
});

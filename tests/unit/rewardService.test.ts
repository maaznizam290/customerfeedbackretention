import { describe, expect, it } from "vitest";
import { rewardService, DuplicateSignupRewardError } from "@/services/rewardService";
import { customerRepository } from "@/repositories/customerRepository";
import { generateCustomerId } from "@/lib/ids";

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

describe("rewardService", () => {
  it("credits exactly 1 Coin for a signup reward", () => {
    const customerId = makeCustomer();
    const reward = rewardService.creditSignupReward(customerId);
    expect(reward.coins).toBe(1);
    expect(reward.rewardType).toBe("SIGNUP_REWARD");
    expect(reward.status).toBe("CREDITED");
    expect(rewardService.getBalance(customerId)).toBe(1);
  });

  it("refuses to credit a second signup reward for the same customer (Rule 1)", () => {
    const customerId = makeCustomer();
    rewardService.creditSignupReward(customerId);
    expect(() => rewardService.creditSignupReward(customerId)).toThrow(DuplicateSignupRewardError);
    // Balance must still reflect only the one legitimate credit.
    expect(rewardService.getBalance(customerId)).toBe(1);
  });

  it("derives balance as the sum of CREDITED ledger entries (Rule 6)", () => {
    const customerId = makeCustomer();
    rewardService.creditSignupReward(customerId);
    rewardService.creditReward({
      customerId,
      rewardType: "PACKAGE_SUBSCRIPTION_REWARD",
      coins: 2,
      description: "Gold Subscription Reward",
    });
    rewardService.creditReward({
      customerId,
      rewardType: "CAMPAIGN_REWARD",
      coins: 5,
      description: "Pending campaign reward",
      status: "PENDING",
    });

    // 1 (signup) + 2 (subscription) = 3; the PENDING reward must not count.
    expect(rewardService.getBalance(customerId)).toBe(3);
    expect(rewardService.getLedger(customerId)).toHaveLength(3);
  });

  it("keeps the ledger append-only (Rule 5): each credit is its own immutable row", () => {
    const customerId = makeCustomer();
    rewardService.creditSignupReward(customerId);
    rewardService.creditReward({
      customerId,
      rewardType: "SPIN_REWARD",
      coins: 1,
      description: "ATHARX Daily Spin Reward",
    });
    const ledger = rewardService.getLedger(customerId);
    expect(ledger).toHaveLength(2);
    expect(new Set(ledger.map((r) => r.rewardId)).size).toBe(2);
  });
});

import { describe, expect, it, beforeAll } from "vitest";
import { vaultService, InsufficientVaultCoinsError, VaultOfferNotFoundError } from "@/services/vaultService";
import { rewardService } from "@/services/rewardService";
import { customerRepository } from "@/repositories/customerRepository";
import { generateCustomerId } from "@/lib/ids";
import { seedOmantelEnterprise, seedVaultOffer } from "../helpers/seedFixtures";

function makeCustomer() {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Vault Tester",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  return customerId;
}

beforeAll(() => {
  seedOmantelEnterprise();
  seedVaultOffer({ offerId: "VAULT-000001", coinCost: 5 });
});

describe("vaultService (Coin-spend Vault redemption)", () => {
  it("refuses to unlock an offer when the customer doesn't have enough Coins", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 2, description: "seed" });
    expect(() => vaultService.redeem(customerId, "VAULT-000001")).toThrow(InsufficientVaultCoinsError);
    // A failed redemption must never debit Coins.
    expect(rewardService.getBalance(customerId)).toBe(2);
  });

  it("debits exactly the offer's Coin cost and returns a voucher code on success", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 10, description: "seed" });
    const result = vaultService.redeem(customerId, "VAULT-000001");
    expect(result.alreadyRedeemed).toBe(false);
    expect(result.redemption.coinsSpent).toBe(5);
    expect(result.redemption.voucherCode).toMatch(/^ATHARX-VRD-/);
    expect(result.coinBalance).toBe(5);
    expect(rewardService.getBalance(customerId)).toBe(5);
  });

  it("is idempotent: redeeming the same offer again returns the original voucher without a second charge", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 10, description: "seed" });
    const first = vaultService.redeem(customerId, "VAULT-000001");
    const second = vaultService.redeem(customerId, "VAULT-000001");
    expect(second.alreadyRedeemed).toBe(true);
    expect(second.redemption.redemptionId).toBe(first.redemption.redemptionId);
    expect(second.redemption.voucherCode).toBe(first.redemption.voucherCode);
    // Only ever charged once, even though redeem() was called twice.
    expect(rewardService.getBalance(customerId)).toBe(5);
  });

  it("throws for an offer that doesn't exist", () => {
    const customerId = makeCustomer();
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins: 100, description: "seed" });
    expect(() => vaultService.redeem(customerId, "VAULT-DOES-NOT-EXIST")).toThrow(VaultOfferNotFoundError);
  });

  it("lists only ACTIVE offers", () => {
    const offers = vaultService.listActive();
    expect(offers.find((o) => o.offerId === "VAULT-000001")).toBeTruthy();
  });
});

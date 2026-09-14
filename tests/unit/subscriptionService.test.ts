import { describe, expect, it, beforeAll } from "vitest";
import {
  subscriptionService,
  PackageUnavailableError,
} from "@/services/subscriptionService";
import { rewardService } from "@/services/rewardService";
import {
  seedGoldCampaign,
  seedGoldPackage,
  seedInactivePackage,
  seedOmantelEnterprise,
  seedPackagePurchaseBehaviour,
} from "../helpers/seedFixtures";

beforeAll(() => {
  seedOmantelEnterprise();
  seedPackagePurchaseBehaviour();
  seedGoldPackage();
  seedGoldCampaign();
  seedInactivePackage();
});

describe("subscriptionService.subscribe", () => {
  it("creates a subscriber/customer identity keyed by MSISDN and activates the subscription (Acceptance 8-13)", async () => {
    const result = await subscriptionService.subscribe({
      consumerName: "Ahmed",
      mobile: "+96891112222",
      packageId: "OMT-GOLD-05",
      idempotencyKey: "REQ-TEST-0001",
    });

    expect(result.subscription.status).toBe("ACTIVE");
    expect(result.subscriber.normalizedMsisdn).toBe("+96891112222");
    expect(result.subscriber.subscriberId).toMatch(/^ATH-SUB-\d{6}$/);
    expect(result.subscription.customerId).toMatch(/^CUS-OM-\d{6}$/);
    // Rule: the phone number itself must never be used as a primary key —
    // the generated identifiers are what link everything together.
    expect(result.subscription.subscriberId).toBe(result.subscriber.subscriberId);
  });

  it("credits the campaign-configured reward, not a hard-coded amount", async () => {
    const result = await subscriptionService.subscribe({
      consumerName: "Fatima",
      mobile: "+96891112223",
      packageId: "OMT-GOLD-05",
      idempotencyKey: "REQ-TEST-0002",
    });
    expect(result.reward?.coins).toBe(2);
    expect(rewardService.getBalance(result.subscription.customerId)).toBe(2);
  });

  it("rejects an unavailable/inactive package", async () => {
    await expect(
      subscriptionService.subscribe({
        consumerName: "Khalid",
        mobile: "+96891112224",
        packageId: "OMT-RETIRED-01",
        idempotencyKey: "REQ-TEST-0003",
      })
    ).rejects.toThrow(PackageUnavailableError);
  });

  it("is idempotent: replaying the same idempotency_key returns the original subscription without a duplicate or a second reward (Rule 2)", async () => {
    const key = "REQ-TEST-0004";
    const first = await subscriptionService.subscribe({
      consumerName: "Mariam",
      mobile: "+96891112225",
      packageId: "OMT-GOLD-05",
      idempotencyKey: key,
    });
    const second = await subscriptionService.subscribe({
      consumerName: "Mariam",
      mobile: "+96891112225",
      packageId: "OMT-GOLD-05",
      idempotencyKey: key,
    });

    expect(second.subscription.subscriptionId).toBe(first.subscription.subscriptionId);
    expect(second.isReplay).toBe(true);
    expect(second.reward).toBeNull();
    expect(rewardService.getBalance(first.subscription.customerId)).toBe(2);
  });

  it("reuses the same subscriber for a customer subscribing twice with the same MSISDN, rather than creating a duplicate", async () => {
    const mobile = "+96891112226";
    const first = await subscriptionService.subscribe({
      consumerName: "Repeat Customer",
      mobile,
      packageId: "OMT-GOLD-05",
      idempotencyKey: "REQ-TEST-0005",
    });
    const second = await subscriptionService.subscribe({
      consumerName: "Repeat Customer",
      mobile,
      packageId: "OMT-GOLD-05",
      idempotencyKey: "REQ-TEST-0006",
    });

    expect(second.subscriber.subscriberId).toBe(first.subscriber.subscriberId);
    expect(second.subscription.subscriptionId).not.toBe(first.subscription.subscriptionId);
    // Two successful subscriptions -> two subscription rewards for the same customer.
    expect(rewardService.getBalance(first.subscription.customerId)).toBe(4);
  });
});

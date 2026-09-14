import { describe, expect, it, beforeAll } from "vitest";
import { behaviourService } from "@/services/behaviourService";
import { tokenService } from "@/services/tokenService";
import { behaviourEventService } from "@/services/behaviourEventService";
import { rewardService } from "@/services/rewardService";
import { customerRepository } from "@/repositories/customerRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { behaviourRepository } from "@/repositories/behaviourRepository";
import { generateCustomerId } from "@/lib/ids";
import {
  seedExperienceCampaign,
  seedOmantelEnterprise,
  seedRechargeBehaviour,
} from "../helpers/seedFixtures";

function makeCustomer() {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Token Test Customer",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  return customerId;
}

beforeAll(() => {
  seedOmantelEnterprise();
  seedRechargeBehaviour();
  seedExperienceCampaign();
});

describe("behaviourService (behaviour engine)", () => {
  it("qualifies a payload that meets an amount_gte rule", () => {
    expect(behaviourService.evaluate({ amount_gte: 5 }, { amount: 5 })).toBe(true);
    expect(behaviourService.evaluate({ amount_gte: 5 }, { amount: 10 })).toBe(true);
  });

  it("rejects a payload below the rule threshold", () => {
    expect(behaviourService.evaluate({ amount_gte: 5 }, { amount: 2 })).toBe(false);
  });

  it("finds the matching ACTIVE behaviour for an event type + payload", () => {
    const behaviour = behaviourService.findQualifying("RECHARGE", { amount: 5 });
    expect(behaviour?.behaviorId).toBe("BEH-RECHARGE-005");
  });

  it("returns null when no active behaviour's rule is satisfied", () => {
    expect(behaviourService.findQualifying("RECHARGE", { amount: 1 })).toBeNull();
    expect(behaviourService.findQualifying("UNKNOWN_EVENT", {})).toBeNull();
  });
});

describe("tokenService (token engine)", () => {
  it("builds ids in {ENTERPRISE}-{YY}-{CAMPAIGN}-{SEQUENCE} format", () => {
    const tokenId = tokenService.buildTokenId("OMT", "F1", new Date("2026-01-01T00:00:00Z"));
    expect(tokenId).toMatch(/^OMT-26-F1-\d{6}$/);
  });

  it("increments the sequence per (enterprise, year, campaign) scope, never colliding", () => {
    const first = tokenService.buildTokenId("OMT", "F1", new Date("2026-01-01T00:00:00Z"));
    const second = tokenService.buildTokenId("OMT", "F1", new Date("2026-01-01T00:00:00Z"));
    expect(first).not.toBe(second);
  });

  it("scopes sequences independently per campaign code", () => {
    // A brand-new campaign code (never used elsewhere in this file) always
    // starts its own sequence at 1, proving campaign codes don't share a
    // global counter.
    const gold = tokenService.buildTokenId("OMT", "GOLD", new Date("2026-06-01T00:00:00Z"));
    expect(gold).toMatch(/^OMT-26-GOLD-000001$/);
  });
});

describe("behaviourEventService (qualifying-event pipeline)", () => {
  it("issues a token and credits Coins for a qualifying event", () => {
    const customerId = makeCustomer();
    const balanceBefore = rewardService.getBalance(customerId);

    const result = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType: "RECHARGE",
      payload: { amount: 5 },
    });

    expect(result.qualified).toBe(true);
    expect(result.token?.tokenId).toMatch(/^OMT-\d{2}-F1-\d{6}$/);
    expect(result.campaign?.campaignId).toBe("CMP-F1-001");
    expect(result.coinReward).toBe(1);
    expect(rewardService.getBalance(customerId)).toBe(balanceBefore + 1);
  });

  it("records a REJECTED, tokenless event when nothing qualifies", () => {
    const customerId = makeCustomer();
    const balanceBefore = rewardService.getBalance(customerId);

    const result = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType: "RECHARGE",
      payload: { amount: 2 },
    });

    expect(result.qualified).toBe(false);
    expect(result.token).toBeNull();
    expect(result.coinReward).toBe(0);
    expect(result.event.status).toBe("REJECTED");
    expect(rewardService.getBalance(customerId)).toBe(balanceBefore);
  });

  it("never oversells a campaign's token capacity", () => {
    behaviourRepository.create({
      behaviorId: "BEH-CAP-TEST-001",
      name: "Capacity Test Behaviour",
      eventType: "CAP_TEST_EVENT",
      rule: {},
      description: "Isolated behaviour used only by the capacity test below.",
    });
    campaignRepository.create({
      campaignId: "CMP-CAP-TEST-001",
      campaignCode: "CAPTEST",
      enterpriseId: "OMT",
      segment: "PREPAID",
      name: "Capacity Test Campaign",
      category: "Featured Experience",
      campaignType: "RECHARGE_THRESHOLD",
      behaviourId: "BEH-CAP-TEST-001",
      description: "Capacity-limited test campaign.",
      eligibility: "Test only.",
      rewardType: "EXPERIENCE",
      rewardCoins: 1,
      experienceTitle: "Capacity Test",
      experienceDescription: "Test only.",
      tokenCapacity: 1,
      selectionMethod: "RANDOM_DRAW",
      winnerCount: 1,
      packageId: null,
      startDate: new Date().toISOString(),
      endDate: null,
      status: "ACTIVE",
    });

    const first = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType: "CAP_TEST_EVENT",
      payload: {},
    });
    const second = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType: "CAP_TEST_EVENT",
      payload: {},
    });

    expect(first.qualified).toBe(true);
    expect(first.campaign?.campaignId).toBe("CMP-CAP-TEST-001");
    // Capacity is exhausted after the first token, so the second identical
    // event finds no qualifying campaign left and is recorded as rejected.
    expect(second.qualified).toBe(false);
    expect(second.campaign).toBeNull();
  });
});

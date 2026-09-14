import { describe, expect, it, beforeAll } from "vitest";
import { behaviourEventService } from "@/services/behaviourEventService";
import { campaignService, InvalidCampaignTransitionError } from "@/services/campaignService";
import { selectionService, CampaignNotClosableError } from "@/services/selectionService";
import { customerRepository } from "@/repositories/customerRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { generateCustomerId } from "@/lib/ids";
import { seedExperienceCampaign, seedOmantelEnterprise, seedRechargeBehaviour } from "../helpers/seedFixtures";

function makeCustomer() {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Selection Test Customer",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  return customerId;
}

function issueTokens(count: number) {
  for (let i = 0; i < count; i++) {
    behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType: "RECHARGE",
      payload: { amount: 5 },
    });
  }
}

beforeAll(() => {
  seedOmantelEnterprise();
  seedRechargeBehaviour();
  seedExperienceCampaign({ winnerCount: 2 });
});

describe("campaignService lifecycle (state machine)", () => {
  it("refuses an invalid transition, e.g. ACTIVE straight to COMPLETED", () => {
    expect(() => campaignService.setStatus("CMP-F1-001", "COMPLETED")).toThrow(InvalidCampaignTransitionError);
  });
});

describe("selectionService (selection engine)", () => {
  it("refuses to run selection on a campaign that isn't CLOSED yet", () => {
    expect(campaignService.getByCampaignId("CMP-F1-001")?.status).toBe("ACTIVE");
    expect(() => selectionService.executeSelection("CMP-F1-001")).toThrow(CampaignNotClosableError);
  });

  it("draws exactly winnerCount winners from the eligible token pool, records an audit trail, and closes the campaign", () => {
    issueTokens(5);
    campaignService.setStatus("CMP-F1-001", "CLOSED");

    const { run, results } = selectionService.executeSelection("CMP-F1-001");

    expect(run.eligibleCount).toBe(5);
    expect(run.selectedCount).toBe(2);
    expect(results).toHaveLength(2);
    expect(new Set(results.map((r) => r.tokenId)).size).toBe(2); // no duplicate winners
    expect(results.map((r) => r.rank).sort()).toEqual([1, 2]);
    expect(run.auditReference).toBeTruthy();

    const campaign = campaignService.getByCampaignId("CMP-F1-001");
    expect(campaign?.status).toBe("COMPLETED");
  });

  it("caps winnerCount at the eligible pool size instead of erroring", () => {
    campaignRepository.create({
      campaignId: "CMP-SMALLPOOL-001",
      campaignCode: "SMALLPOOL",
      enterpriseId: "OMT",
      segment: "PREPAID",
      name: "Small Pool Campaign",
      category: "Featured Experience",
      campaignType: "RECHARGE_THRESHOLD",
      behaviourId: "BEH-RECHARGE-005",
      description: "Only ever issues one token in this test.",
      eligibility: "Test only.",
      rewardType: "EXPERIENCE",
      rewardCoins: 1,
      experienceTitle: "Small Pool",
      experienceDescription: "Test only.",
      tokenCapacity: 1,
      selectionMethod: "RANDOM_DRAW",
      winnerCount: 5,
      packageId: null,
      startDate: new Date().toISOString(),
      endDate: null,
      status: "ACTIVE",
    });

    behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType: "RECHARGE",
      payload: { amount: 5 },
    });

    campaignService.setStatus("CMP-SMALLPOOL-001", "CLOSED");
    const { run, results } = selectionService.executeSelection("CMP-SMALLPOOL-001");

    expect(run.eligibleCount).toBe(1);
    expect(run.selectedCount).toBe(1);
    expect(results).toHaveLength(1);
  });
});

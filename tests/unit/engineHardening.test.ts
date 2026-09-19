import { describe, expect, it, beforeAll } from "vitest";
import { behaviourEventService } from "@/services/behaviourEventService";
import { campaignService } from "@/services/campaignService";
import { selectionService } from "@/services/selectionService";
import { tokenService } from "@/services/tokenService";
import { auditService } from "@/services/auditService";
import { customerRepository } from "@/repositories/customerRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { behaviourRepository } from "@/repositories/behaviourRepository";
import { generateCustomerId } from "@/lib/ids";
import { seedOmantelEnterprise } from "../helpers/seedFixtures";

let seq = 0;
/** A fresh, isolated behaviour + campaign pair per test, so nothing in this
 *  file competes with anything else for the same qualifying event. */
function makeIsolatedCampaign(overrides: {
  maxTokensPerCustomer?: number | null;
  tokenCapacity?: number | null;
  winnerCount?: number;
  selectionMethod?: "ALL_ELIGIBLE" | "RANDOM_DRAW";
  startDate?: string;
  endDate?: string | null;
  status?: "ACTIVE" | "DRAFT" | "CLOSED";
}) {
  seq += 1;
  const suffix = `HARD${seq}`;
  const eventType = `EVENT_${suffix}`;
  behaviourRepository.create({
    behaviorId: `BEH-${suffix}`,
    name: `Isolated Behaviour ${suffix}`,
    eventType,
    rule: {},
    description: "Test only.",
  });
  const campaign = campaignRepository.create({
    campaignId: `CMP-${suffix}`,
    campaignCode: suffix,
    enterpriseId: "OMT",
    segment: "PREPAID",
    name: `Isolated Campaign ${suffix}`,
    category: "Featured Experience",
    campaignType: "GENERAL",
    behaviourId: `BEH-${suffix}`,
    description: "Test only.",
    eligibility: "Test only.",
    rewardType: "EXPERIENCE",
    rewardCoins: 1,
    experienceTitle: `Isolated ${suffix}`,
    experienceDescription: "Test only.",
    tokenCapacity: overrides.tokenCapacity ?? null,
    maxTokensPerCustomer: overrides.maxTokensPerCustomer ?? null,
    selectionMethod: overrides.selectionMethod ?? "RANDOM_DRAW",
    winnerCount: overrides.winnerCount ?? 1,
    packageId: null,
    startDate: overrides.startDate ?? new Date().toISOString(),
    endDate: overrides.endDate ?? null,
    status: overrides.status ?? "ACTIVE",
  });
  return { eventType, campaign };
}

function makeCustomer() {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Hardening Test Customer",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  return customerId;
}

beforeAll(() => {
  seedOmantelEnterprise();
});

describe("idempotency (spec §13, mandatory)", () => {
  it("returns the original outcome on a repeated idempotency_key instead of reprocessing", () => {
    const { eventType, campaign } = makeIsolatedCampaign({});
    const customerId = makeCustomer();
    const key = `IDEMP-TEST-${customerId}`;

    const first = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType,
      payload: {},
      idempotencyKey: key,
    });
    const second = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType,
      payload: {},
      idempotencyKey: key,
    });

    expect(first.isReplay).toBe(false);
    expect(second.isReplay).toBe(true);
    expect(second.qualified).toBe(true);
    expect(second.token?.tokenId).toBe(first.token?.tokenId);
    expect(campaignService.tokensIssued(campaign.campaignId)).toBe(1);
  });
});

describe("per-customer token limit (spec: Maximum Tokens/Customer, Enterprise-configurable)", () => {
  it("stops issuing new tokens to the same customer once the configured limit is reached", () => {
    const { eventType, campaign } = makeIsolatedCampaign({ maxTokensPerCustomer: 1 });
    const customerId = makeCustomer();

    const first = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType,
      payload: {},
      idempotencyKey: `PERCUST-1-${customerId}`,
    });
    const second = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType,
      payload: {},
      idempotencyKey: `PERCUST-2-${customerId}`,
    });

    expect(first.qualified).toBe(true);
    expect(first.campaign?.campaignId).toBe(campaign.campaignId);
    expect(second.qualified).toBe(false);
    expect(second.reason).toMatch(/Customer token limit reached/);

    // A DIFFERENT customer is unaffected by the first customer's limit.
    const third = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType,
      payload: {},
    });
    expect(third.qualified).toBe(true);
  });
});

describe("campaign date window (spec: campaign start/end are Enterprise-configurable)", () => {
  it("rejects an event with a clear reason when the campaign has not started yet", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const { eventType } = makeIsolatedCampaign({ startDate: future });

    const result = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType,
      payload: {},
    });

    expect(result.qualified).toBe(false);
    expect(result.reason).toMatch(/has not started yet/);
  });

  it("rejects an event with a clear reason when the campaign has already expired", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
    const expired = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
    const { eventType } = makeIsolatedCampaign({ startDate: past, endDate: expired });

    const result = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType,
      payload: {},
    });

    expect(result.qualified).toBe(false);
    expect(result.reason).toMatch(/has expired/);
  });
});

describe("audit trail (spec §28/§42)", () => {
  it("records a TOKEN_ISSUED audit entry for a qualifying event", () => {
    const { eventType } = makeIsolatedCampaign({});
    const customerId = makeCustomer();
    const result = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType,
      payload: {},
    });
    expect(result.qualified).toBe(true);

    const entries = auditService.search({ customerId });
    expect(entries.some((e) => e.eventType === "TOKEN_ISSUED" && e.tokenId === result.token?.tokenId)).toBe(true);
  });

  it("records an EVENT_REJECTED audit entry carrying the same reason surfaced to the caller", () => {
    const { eventType } = makeIsolatedCampaign({ startDate: new Date(Date.now() + 86400000).toISOString() });
    const customerId = makeCustomer();
    const result = behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId,
      eventType,
      payload: {},
    });
    expect(result.qualified).toBe(false);

    const entries = auditService.search({ customerId });
    const rejected = entries.find((e) => e.eventType === "EVENT_REJECTED");
    expect(rejected).toBeTruthy();
    expect((rejected!.afterValue as { reason: string }).reason).toBe(result.reason);
  });

  it("records CAMPAIGN_STATUS_CHANGED with before/after values when an admin transitions a campaign", () => {
    const { campaign } = makeIsolatedCampaign({ status: "DRAFT" });
    campaignService.setStatus(campaign.campaignId, "ACTIVE");

    const entries = auditService.search({ campaignId: campaign.campaignId });
    const statusChange = entries.find((e) => e.eventType === "CAMPAIGN_STATUS_CHANGED");
    expect(statusChange).toBeTruthy();
    expect((statusChange!.beforeValue as { status: string }).status).toBe("DRAFT");
    expect((statusChange!.afterValue as { status: string }).status).toBe("ACTIVE");
  });
});

describe("selection engine integrity: lock, hash, revalidation, alternate selection (spec §24/§25/§42)", () => {
  it("locks the eligible pool with a SHA-256 integrity hash before any draw happens", () => {
    const { eventType, campaign } = makeIsolatedCampaign({ winnerCount: 1 });
    for (let i = 0; i < 3; i++) {
      behaviourEventService.processEvent({
        enterpriseId: "OMT",
        customerId: makeCustomer(),
        eventType,
        payload: {},
      });
    }
    campaignService.setStatus(campaign.campaignId, "CLOSED");

    const lockRun = selectionService.lockEligiblePool(campaign.campaignId);
    expect(lockRun.status).toBe("LOCKED");
    expect(lockRun.eligibleCount).toBe(3);
    expect(lockRun.eligiblePoolHash).toMatch(/^[a-f0-9]{64}$/);
    expect(lockRun.lockedAt).toBeTruthy();

    const auditEntries = auditService.search({ campaignId: campaign.campaignId });
    expect(auditEntries.some((e) => e.eventType === "ELIGIBLE_POOL_LOCKED")).toBe(true);
  });

  it("refuses to lock the same campaign's pool twice", () => {
    const { campaign } = makeIsolatedCampaign({ status: "CLOSED" });
    selectionService.lockEligiblePool(campaign.campaignId);
    expect(() => selectionService.lockEligiblePool(campaign.campaignId)).toThrow(/already locked/);
  });

  it("draws only from the pool frozen at lock time, revalidates each winner, and picks an alternate on failure", () => {
    const { eventType, campaign } = makeIsolatedCampaign({ winnerCount: 2 });
    const tokenIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const result = behaviourEventService.processEvent({
        enterpriseId: "OMT",
        customerId: makeCustomer(),
        eventType,
        payload: {},
      });
      tokenIds.push(result.token!.tokenId);
    }
    campaignService.setStatus(campaign.campaignId, "CLOSED");
    selectionService.lockEligiblePool(campaign.campaignId);

    // Simulate exception management (§26): an admin places two of the three
    // locked tokens on HOLD after the pool was locked but before the draw —
    // exactly the gap winner revalidation exists to catch.
    tokenService.setStatus(tokenIds[0], "HOLD");
    tokenService.setStatus(tokenIds[1], "HOLD");

    const { run, results } = selectionService.executeSelection(campaign.campaignId);

    // Only the one still-ISSUED token can validly win; the campaign asked
    // for 2 winners but only 1 eligible candidate remains in the pool.
    expect(results.length).toBe(1);
    expect(results[0].tokenId).toBe(tokenIds[2]);
    expect(run.status).toBe("COMPLETED");
    expect(run.selectedCount).toBe(1);

    const auditEntries = auditService.search({ campaignId: campaign.campaignId });
    const failures = auditEntries.filter((e) => e.eventType === "WINNER_REVALIDATION_FAILED");
    expect(failures.length).toBe(2);
    expect(auditEntries.some((e) => e.eventType === "ALTERNATE_SELECTED")).toBe(true);
    expect(auditEntries.some((e) => e.eventType === "WINNER_SELECTED")).toBe(true);
  });

  it("a single executeSelection call still auto-locks and completes end-to-end (backward-compatible one-step flow)", () => {
    const { eventType, campaign } = makeIsolatedCampaign({ winnerCount: 1, selectionMethod: "ALL_ELIGIBLE" });
    behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType,
      payload: {},
    });
    campaignService.setStatus(campaign.campaignId, "CLOSED");

    const { run, results } = selectionService.executeSelection(campaign.campaignId);
    expect(run.status).toBe("COMPLETED");
    expect(run.eligiblePoolHash).toMatch(/^[a-f0-9]{64}$/);
    expect(results).toHaveLength(1);
    expect(campaignService.getByCampaignId(campaign.campaignId)?.status).toBe("COMPLETED");
  });

  it("refuses to execute selection twice for the same campaign", () => {
    const { eventType, campaign } = makeIsolatedCampaign({ winnerCount: 1 });
    behaviourEventService.processEvent({
      enterpriseId: "OMT",
      customerId: makeCustomer(),
      eventType,
      payload: {},
    });
    campaignService.setStatus(campaign.campaignId, "CLOSED");
    selectionService.executeSelection(campaign.campaignId);

    expect(() => selectionService.executeSelection(campaign.campaignId)).toThrow(/already been executed/);
  });
});

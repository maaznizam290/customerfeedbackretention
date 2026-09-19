import { campaignRepository } from "@/repositories/campaignRepository";
import { tokenRepository } from "@/repositories/tokenRepository";
import { generateCampaignId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import { auditService } from "@/services/auditService";
import type { Campaign, CampaignType, RewardCatalogType, SelectionMethod } from "@/types";

export interface QualifyingCampaignLookup {
  campaign: Campaign | null;
  /** Human-readable reason no campaign qualified — null when campaign is non-null. */
  reason: string | null;
}

const ALLOWED_TRANSITIONS: Record<Campaign["status"], Campaign["status"][]> = {
  DRAFT: ["ACTIVE"],
  ACTIVE: ["PAUSED", "CLOSED"],
  PAUSED: ["ACTIVE", "CLOSED"],
  CLOSED: ["COMPLETED"],
  COMPLETED: [],
  INACTIVE: ["ACTIVE"],
  EXPIRED: [],
  SANDBOX: ["ACTIVE"],
};

export class InvalidCampaignTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Campaign cannot move from ${from} to ${to}.`, 409, "INVALID_TRANSITION");
  }
}

/**
 * The campaign engine. A campaign couples an ENTERPRISE, a qualifying
 * BEHAVIOUR, a reward/experience, and (for limited-inventory experiences)
 * a token capacity and selection method. Reward amounts are always resolved
 * here from configurable rows, never hard-coded in UI components (Rule 4).
 */
export const campaignService = {
  listActive(): Campaign[] {
    return campaignRepository.listActive();
  },

  listAll(): Campaign[] {
    return campaignRepository.listAll();
  },

  getByCampaignId(campaignId: string): Campaign | null {
    return campaignRepository.findByCampaignId(campaignId);
  },

  /** Resolves the Coin reward for subscribing to a given package (legacy path, kept for the reward catalog view). */
  getSubscriptionReward(packageId: string, fallbackCoins: number): number {
    const campaign = campaignRepository.findActiveByPackageAndType(packageId, "PACKAGE_SUBSCRIPTION");
    return campaign ? campaign.rewardCoins : fallbackCoins;
  },

  getRewardForType(campaignType: CampaignType, fallbackCoins = 0): number {
    const campaign = campaignRepository.findActiveByType(campaignType);
    return campaign ? campaign.rewardCoins : fallbackCoins;
  },

  /**
   * The behaviour-event pipeline's core lookup: given a qualifying
   * behaviour and optional context (e.g. the package being purchased),
   * find the single best-matching ACTIVE campaign that is within its
   * configured date window and still has campaign- and customer-level
   * token capacity remaining. Returns a null campaign with a human-
   * readable `reason` when nothing currently qualifies — that is a
   * normal, expected outcome, not an error, and the reason is exactly
   * what the Event Simulator / audit trail surface to the caller.
   */
  findQualifyingCampaign(
    behaviorId: string,
    context: { packageId?: string | null; customerId?: string | null; now?: Date } = {}
  ): QualifyingCampaignLookup {
    const candidates = campaignRepository.listActiveByBehaviour(behaviorId);
    if (candidates.length === 0) {
      return { campaign: null, reason: "No active campaign is configured for this behaviour." };
    }

    const now = context.now ?? new Date();
    let lastReason: string | null = null;

    for (const campaign of candidates) {
      if (campaign.packageId && campaign.packageId !== context.packageId) {
        lastReason = `Campaign ${campaign.campaignId} requires package ${campaign.packageId}.`;
        continue;
      }
      if (new Date(campaign.startDate) > now) {
        lastReason = `Campaign ${campaign.campaignId} has not started yet.`;
        continue;
      }
      if (campaign.endDate && new Date(campaign.endDate) < now) {
        lastReason = `Campaign ${campaign.campaignId} has expired.`;
        continue;
      }
      if (campaign.tokenCapacity !== null) {
        const issued = tokenRepository.countForCampaign(campaign.campaignId);
        if (issued >= campaign.tokenCapacity) {
          lastReason = `Campaign token limit reached (${campaign.tokenCapacity}).`;
          continue;
        }
      }
      if (campaign.maxTokensPerCustomer !== null && context.customerId) {
        const heldByCustomer = tokenRepository.countForCustomerInCampaign(campaign.campaignId, context.customerId);
        if (heldByCustomer >= campaign.maxTokensPerCustomer) {
          lastReason = `Customer token limit reached (${campaign.maxTokensPerCustomer} per customer).`;
          continue;
        }
      }
      return { campaign, reason: null };
    }
    return { campaign: null, reason: lastReason ?? "No active campaign currently qualifies." };
  },

  tokensIssued(campaignId: string): number {
    return tokenRepository.countForCampaign(campaignId);
  },

  create(input: {
    campaignCode: string;
    enterpriseId: string;
    segment: string;
    name: string;
    category: string;
    campaignType: CampaignType;
    behaviourId: string | null;
    description: string;
    eligibility: string;
    rewardType: RewardCatalogType;
    rewardCoins: number;
    experienceTitle: string | null;
    experienceDescription: string | null;
    tokenCapacity: number | null;
    maxTokensPerCustomer: number | null;
    selectionMethod: SelectionMethod;
    winnerCount: number;
    packageId: string | null;
    startDate: string;
    endDate: string | null;
    status?: Campaign["status"];
  }): Campaign {
    const campaign = campaignRepository.create({
      ...input,
      campaignId: generateCampaignId(input.campaignCode),
      status: input.status ?? "DRAFT",
    });
    auditService.record({
      eventType: "CAMPAIGN_CREATED",
      enterpriseId: campaign.enterpriseId,
      campaignId: campaign.campaignId,
      actor: "ADMIN",
      afterValue: { name: campaign.name, status: campaign.status, tokenCapacity: campaign.tokenCapacity },
    });
    return campaign;
  },

  setStatus(campaignId: string, nextStatus: Campaign["status"]): Campaign {
    const campaign = campaignRepository.findByCampaignId(campaignId);
    if (!campaign) {
      throw new AppError("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    }
    const allowed = ALLOWED_TRANSITIONS[campaign.status] ?? [];
    if (campaign.status !== nextStatus && !allowed.includes(nextStatus)) {
      throw new InvalidCampaignTransitionError(campaign.status, nextStatus);
    }
    const updated = campaignRepository.setStatus(campaignId, nextStatus)!;
    auditService.record({
      eventType: "CAMPAIGN_STATUS_CHANGED",
      enterpriseId: updated.enterpriseId,
      campaignId: updated.campaignId,
      actor: "ADMIN",
      beforeValue: { status: campaign.status },
      afterValue: { status: updated.status },
    });
    return updated;
  },
};

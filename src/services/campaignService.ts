import { campaignRepository } from "@/repositories/campaignRepository";
import { tokenRepository } from "@/repositories/tokenRepository";
import { generateCampaignId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import type { Campaign, CampaignType, RewardCatalogType, SelectionMethod } from "@/types";

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
   * find the single best-matching ACTIVE campaign that still has token
   * capacity remaining. Returns null if nothing currently qualifies —
   * that is a normal, expected outcome, not an error.
   */
  findQualifyingCampaign(behaviorId: string, context: { packageId?: string | null } = {}): Campaign | null {
    const candidates = campaignRepository.listActiveByBehaviour(behaviorId);
    for (const campaign of candidates) {
      if (campaign.packageId && campaign.packageId !== context.packageId) continue;
      if (campaign.tokenCapacity !== null) {
        const issued = tokenRepository.countForCampaign(campaign.campaignId);
        if (issued >= campaign.tokenCapacity) continue;
      }
      return campaign;
    }
    return null;
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
    selectionMethod: SelectionMethod;
    winnerCount: number;
    packageId: string | null;
    startDate: string;
    endDate: string | null;
    status?: Campaign["status"];
  }): Campaign {
    return campaignRepository.create({
      ...input,
      campaignId: generateCampaignId(input.campaignCode),
      status: input.status ?? "DRAFT",
    });
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
    return campaignRepository.setStatus(campaignId, nextStatus)!;
  },
};

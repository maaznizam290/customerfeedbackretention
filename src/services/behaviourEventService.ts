import { getDb } from "@/lib/db";
import { generateBehaviourEventId } from "@/lib/ids";
import { behaviourService } from "@/services/behaviourService";
import { campaignService } from "@/services/campaignService";
import { tokenService } from "@/services/tokenService";
import { rewardService } from "@/services/rewardService";
import { behaviourEventRepository } from "@/repositories/behaviourEventRepository";
import type { BehaviourEvent, Campaign, CampaignType, Reward, RewardType, Token } from "@/types";

// Keeps the reward ledger's `type` column meaningful (and backward
// compatible with the pre-existing PACKAGE_SUBSCRIPTION_REWARD wording)
// even though every campaign type now issues its reward through the same
// pipeline. Anything without a specific mapping records as CAMPAIGN_REWARD.
const REWARD_TYPE_BY_CAMPAIGN_TYPE: Partial<Record<CampaignType, RewardType>> = {
  PACKAGE_SUBSCRIPTION: "PACKAGE_SUBSCRIPTION_REWARD",
  REFERRAL_SUCCESS: "REFERRAL_SUCCESS",
  RECHARGE_THRESHOLD: "RECHARGE_THRESHOLD",
  PARTNER_PURCHASE: "PARTNER_PURCHASE",
};

export interface QualifyingEventInput {
  enterpriseId: string;
  customerId: string;
  subscriberId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: string;
}

export interface QualifyingEventResult {
  event: BehaviourEvent;
  qualified: boolean;
  campaign: Campaign | null;
  token: Token | null;
  coinReward: number;
  reward: Reward | null;
}

/**
 * The single, generic pipeline every qualifying customer behaviour flows
 * through — whether it originates from the admin Simulator (§11 of the
 * brief) or from a real product action like a prepaid subscription. There
 * is deliberately only one code path so the demo and production flows can
 * never drift apart:
 *
 *   receive event -> match behaviour -> match campaign -> issue token
 *   -> credit coin -> record event
 *
 * Runs inside a single synchronous SQLite transaction (nests safely via
 * savepoints if the caller — e.g. subscriptionService — is already inside
 * one), so a campaign's token capacity can never be oversold under
 * concurrent events.
 */
export const behaviourEventService = {
  processEvent(input: QualifyingEventInput): QualifyingEventResult {
    const db = getDb();
    const run = db.transaction((): QualifyingEventResult => {
      const behaviour = behaviourService.findQualifying(input.eventType, input.payload);
      const packageId =
        typeof input.payload.package_id === "string" ? (input.payload.package_id as string) : null;

      const campaign = behaviour
        ? campaignService.findQualifyingCampaign(behaviour.behaviorId, { packageId })
        : null;

      if (!behaviour || !campaign) {
        const event = behaviourEventRepository.create({
          eventId: generateBehaviourEventId(),
          enterpriseId: input.enterpriseId,
          customerId: input.customerId,
          subscriberId: input.subscriberId ?? null,
          behaviorId: behaviour?.behaviorId ?? null,
          eventType: input.eventType,
          payload: input.payload,
          qualified: false,
          campaignId: null,
          tokenId: null,
          coinReward: 0,
          status: "REJECTED",
        });
        return { event, qualified: false, campaign: null, token: null, coinReward: 0, reward: null };
      }

      // The token id needs the event id it was issued from, so the id is
      // generated first and the behaviour_events row written once, last,
      // with the full outcome already known.
      const eventId = generateBehaviourEventId();

      const token = tokenService.issueToken({
        enterpriseId: input.enterpriseId,
        campaignCode: campaign.campaignCode,
        customerId: input.customerId,
        subscriberId: input.subscriberId ?? null,
        campaignId: campaign.campaignId,
        behaviourEventId: eventId,
        issuedAt: input.timestamp ? new Date(input.timestamp) : new Date(),
      });

      const coinReward = campaign.rewardCoins;
      const reward =
        coinReward > 0
          ? rewardService.creditReward({
              customerId: input.customerId,
              rewardType: REWARD_TYPE_BY_CAMPAIGN_TYPE[campaign.campaignType] ?? "CAMPAIGN_REWARD",
              coins: coinReward,
              description: `${campaign.name} — ${behaviour.name}`,
            })
          : null;

      const event = behaviourEventRepository.create({
        eventId,
        enterpriseId: input.enterpriseId,
        customerId: input.customerId,
        subscriberId: input.subscriberId ?? null,
        behaviorId: behaviour.behaviorId,
        eventType: input.eventType,
        payload: input.payload,
        qualified: true,
        campaignId: campaign.campaignId,
        tokenId: token.tokenId,
        coinReward,
        status: "QUALIFIED",
      });

      return { event, qualified: true, campaign, token, coinReward, reward };
    });

    return run();
  },
};

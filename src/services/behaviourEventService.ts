import { getDb } from "@/lib/db";
import { generateBehaviourEventId } from "@/lib/ids";
import { behaviourService } from "@/services/behaviourService";
import { campaignService } from "@/services/campaignService";
import { tokenService } from "@/services/tokenService";
import { rewardService } from "@/services/rewardService";
import { auditService } from "@/services/auditService";
import { behaviourEventRepository } from "@/repositories/behaviourEventRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { tokenRepository } from "@/repositories/tokenRepository";
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
  /** Caller-supplied idempotency key (spec §13). A repeat key returns the
   *  original outcome (isReplay: true) instead of reprocessing. */
  idempotencyKey?: string | null;
}

export interface QualifyingEventResult {
  event: BehaviourEvent;
  qualified: boolean;
  campaign: Campaign | null;
  token: Token | null;
  coinReward: number;
  reward: Reward | null;
  /** Human-readable reason the event did not qualify — null when qualified. */
  reason: string | null;
  isReplay: boolean;
}

function reconstructResult(event: BehaviourEvent): QualifyingEventResult {
  const campaign = event.campaignId ? campaignRepository.findByCampaignId(event.campaignId) : null;
  const token = event.tokenId ? tokenRepository.findById(event.tokenId) : null;
  return {
    event,
    qualified: event.qualified,
    campaign,
    token,
    coinReward: event.coinReward,
    // The original reward row's id isn't stored on the event row itself;
    // for a replay it is enough that the caller sees the same token/coin
    // outcome and knows no *new* reward is credited a second time.
    reward: null,
    reason: event.rejectionReason,
    isReplay: true,
  };
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
      // Idempotency (spec §13, mandatory): a repeat idempotency_key returns
      // the original outcome untouched — no second token, no second reward,
      // no second audit entry for the event's own qualification.
      if (input.idempotencyKey) {
        const existing = behaviourEventRepository.findByIdempotencyKey(input.idempotencyKey);
        if (existing) return reconstructResult(existing);
      }

      const behaviour = behaviourService.findQualifying(input.eventType, input.payload);
      const packageId =
        typeof input.payload.package_id === "string" ? (input.payload.package_id as string) : null;

      const lookup = behaviour
        ? campaignService.findQualifyingCampaign(behaviour.behaviorId, {
            packageId,
            customerId: input.customerId,
            now: input.timestamp ? new Date(input.timestamp) : undefined,
          })
        : { campaign: null, reason: "No behaviour rule matches this event type/value." };

      auditService.record({
        eventType: "EVENT_RECEIVED",
        enterpriseId: input.enterpriseId,
        customerId: input.customerId,
        campaignId: lookup.campaign?.campaignId ?? null,
        actor: "SYSTEM",
        afterValue: { eventType: input.eventType, payload: input.payload },
      });

      if (!behaviour || !lookup.campaign) {
        const reason = lookup.reason ?? "No active campaign currently qualifies.";
        const event = behaviourEventRepository.create({
          eventId: generateBehaviourEventId(),
          idempotencyKey: input.idempotencyKey ?? null,
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
          rejectionReason: reason,
        });
        auditService.record({
          eventType: "EVENT_REJECTED",
          enterpriseId: input.enterpriseId,
          customerId: input.customerId,
          actor: "SYSTEM",
          afterValue: { eventId: event.eventId, reason },
        });
        return { event, qualified: false, campaign: null, token: null, coinReward: 0, reward: null, reason, isReplay: false };
      }

      const campaign = lookup.campaign;

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

      auditService.record({
        eventType: "TOKEN_ISSUED",
        enterpriseId: input.enterpriseId,
        campaignId: campaign.campaignId,
        customerId: input.customerId,
        tokenId: token.tokenId,
        actor: "SYSTEM",
        afterValue: { tokenId: token.tokenId, campaignId: campaign.campaignId },
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
        idempotencyKey: input.idempotencyKey ?? null,
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
        rejectionReason: null,
      });

      return { event, qualified: true, campaign, token, coinReward, reward, reason: null, isReplay: false };
    });

    return run();
  },
};

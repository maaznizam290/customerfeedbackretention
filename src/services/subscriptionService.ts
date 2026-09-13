import { getDb } from "@/lib/db";
import { generateSubscriptionId, generateTransactionId } from "@/lib/ids";
import { normalizeOmanMsisdn } from "@/lib/msisdn";
import { AppError } from "@/lib/errors";
import { packageRepository } from "@/repositories/packageRepository";
import { subscriberRepository } from "@/repositories/subscriberRepository";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";
import { transactionRepository } from "@/repositories/transactionRepository";
import { getTelecomAdapter } from "@/adapters/telecom";
import { campaignService } from "@/services/campaignService";
import { rewardService } from "@/services/rewardService";
import { luckyDrawService } from "@/services/luckyDrawService";
import { milestoneService } from "@/services/milestoneService";
import { customerService } from "@/services/customerService";
import type { Reward, Subscriber, Subscription } from "@/types";

export class PackageUnavailableError extends AppError {
  constructor() {
    super("This package is currently unavailable.", 404, "PACKAGE_UNAVAILABLE");
  }
}

export class SubscriptionFailedError extends AppError {
  constructor(reason: string) {
    super("We couldn't complete your subscription right now. Please try again.", 502, "SUBSCRIPTION_FAILED", {
      reason,
    });
  }
}

export interface SubscribeResult {
  subscription: Subscription;
  subscriber: Subscriber;
  reward: Reward | null;
  balanceBefore: number;
  balanceAfter: number;
  vipJustReached: boolean;
  isReplay: boolean;
}

export const subscriptionService = {
  /**
   * Resolves the ATHARX customer/subscriber identity purely from the MSISDN
   * (matching the Telenor-style integration contract, which carries no
   * customer_id field): a number that already has an active ATHARX
   * subscriber (e.g. from a prior signup) is reused as-is; a brand-new
   * number gets a freshly provisioned customer + subscriber so the
   * customer -> subscriber -> msisdn hierarchy always exists (Rule 3).
   */
  async subscribe(input: {
    consumerName: string;
    mobile: string;
    packageId: string;
    idempotencyKey: string;
  }): Promise<SubscribeResult> {
    // Rule 2: a subscription request must only ever create one subscription.
    const existingByKey = subscriptionRepository.findByIdempotencyKey(input.idempotencyKey);
    if (existingByKey) {
      return this.buildReplayResult(existingByKey);
    }

    const pkg = packageRepository.findByPackageId(input.packageId);
    if (!pkg || pkg.status !== "ACTIVE") {
      throw new PackageUnavailableError();
    }

    const normalizedMsisdn = normalizeOmanMsisdn(input.mobile);

    const foundSubscriber = subscriberRepository.findActiveByNormalizedMsisdn(normalizedMsisdn);
    const resolvedSubscriber: Subscriber =
      foundSubscriber ??
      customerService.provisionForSubscription(input.consumerName, input.mobile, normalizedMsisdn).subscriber;
    const customerId = resolvedSubscriber.customerId;

    const adapter = getTelecomAdapter();
    const subscriberId = resolvedSubscriber.subscriberId;
    const adapterResult = await adapter.subscribe({
      customerName: input.consumerName,
      msisdn: normalizedMsisdn,
      packageId: input.packageId,
      subscriberId,
      idempotencyKey: input.idempotencyKey,
    });

    type TxResult =
      | { kind: "REPLAY"; subscription: Subscription }
      | { kind: "FAILED" }
      | {
          kind: "SUCCESS";
          subscriber: Subscriber;
          subscription: Subscription;
          reward: Reward;
          balanceBefore: number;
          balanceAfter: number;
        };

    const db = getDb();
    const run = db.transaction((): TxResult => {
      // Defend against a concurrent identical request that slipped past the
      // pre-check above (still safe: this whole callback runs atomically).
      const raced = subscriptionRepository.findByIdempotencyKey(input.idempotencyKey);
      if (raced) return { kind: "REPLAY", subscription: raced };

      const subscriber = resolvedSubscriber;

      if (!adapterResult.success) {
        const failed = subscriptionRepository.create({
          subscriptionId: adapterResult.subscription_id || generateSubscriptionId(),
          customerId,
          subscriberId: subscriber.subscriberId,
          packageId: input.packageId,
          msisdn: normalizedMsisdn,
          price: pkg.price,
          currency: pkg.currency,
          status: "FAILED",
          idempotencyKey: input.idempotencyKey,
          activatedAt: null,
          expiresAt: null,
        });
        transactionRepository.create({
          transactionId: generateTransactionId(),
          customerId,
          subscriptionId: failed.subscriptionId,
          transactionType: "SUBSCRIPTION",
          amount: pkg.price,
          currency: pkg.currency,
          status: "FAILED",
          reference: adapterResult.error ?? "ADAPTER_FAILURE",
        });
        return { kind: "FAILED" };
      }

      const activatedAt = adapterResult.activated_at;
      const expiresAt = new Date(
        new Date(activatedAt).getTime() + pkg.validityDays * 24 * 60 * 60 * 1000
      ).toISOString();

      const subscription = subscriptionRepository.create({
        subscriptionId: adapterResult.subscription_id,
        customerId,
        subscriberId: subscriber.subscriberId,
        packageId: input.packageId,
        msisdn: normalizedMsisdn,
        price: pkg.price,
        currency: pkg.currency,
        status: "ACTIVE",
        idempotencyKey: input.idempotencyKey,
        activatedAt,
        expiresAt,
      });

      transactionRepository.create({
        transactionId: generateTransactionId(),
        customerId,
        subscriptionId: subscription.subscriptionId,
        transactionType: "SUBSCRIPTION",
        amount: pkg.price,
        currency: pkg.currency,
        status: "SUCCESS",
        reference: subscription.subscriptionId,
      });

      // Rule 7: only a genuinely ACTIVE subscription reaches this point, so a
      // failed provisioning attempt can never grant the subscription reward.
      const balanceBefore = rewardService.getBalance(customerId);
      const rewardCoins = campaignService.getSubscriptionReward(input.packageId, pkg.campaignRewardCoins);
      const reward = rewardService.creditReward({
        customerId,
        subscriptionId: subscription.subscriptionId,
        rewardType: "PACKAGE_SUBSCRIPTION_REWARD",
        coins: rewardCoins,
        description: `${pkg.name} Subscription Reward`,
      });
      const balanceAfter = rewardService.getBalance(customerId);

      luckyDrawService.grantEntryIfEligible(customerId, "PACKAGE_SUBSCRIPTION");

      return { kind: "SUCCESS", subscriber, subscription, reward, balanceBefore, balanceAfter };
    });

    const result = run();

    if (result.kind === "REPLAY") {
      return this.buildReplayResult(result.subscription);
    }
    if (result.kind === "FAILED") {
      throw new SubscriptionFailedError(adapterResult.error ?? "UNKNOWN");
    }

    const milestone = milestoneService.getVipProgress(customerId);
    const vipJustReached =
      !!milestone &&
      milestoneService.justReachedVip(result.balanceBefore, result.balanceAfter, milestone.requiredCoins);

    return {
      subscription: result.subscription,
      subscriber: result.subscriber,
      reward: result.reward,
      balanceBefore: result.balanceBefore,
      balanceAfter: result.balanceAfter,
      vipJustReached,
      isReplay: false,
    };
  },

  buildReplayResult(subscription: Subscription): SubscribeResult {
    const subscriber = subscriberRepository.findBySubscriberId(subscription.subscriberId)!;
    const balance = rewardService.getBalance(subscription.customerId);
    return {
      subscription,
      subscriber,
      reward: null,
      balanceBefore: balance,
      balanceAfter: balance,
      vipJustReached: false,
      isReplay: true,
    };
  },

  async unsubscribe(input: { msisdn: string; packageId: string; reason: string }) {
    const normalizedMsisdn = normalizeOmanMsisdn(input.msisdn);
    const adapter = getTelecomAdapter();
    const result = await adapter.unsubscribe({
      msisdn: normalizedMsisdn,
      packageId: input.packageId,
      reason: input.reason,
      idempotencyKey: `UNSUB-${normalizedMsisdn}-${input.packageId}`,
    });
    if (result.success && result.subscription_id) {
      subscriptionRepository.cancel(result.subscription_id);
    }
    return result;
  },

  getStatusByMsisdn(msisdn: string) {
    const normalizedMsisdn = normalizeOmanMsisdn(msisdn);
    const subscriber = subscriberRepository.findActiveByNormalizedMsisdn(normalizedMsisdn);
    if (!subscriber) return null;
    const subscriptions = subscriptionRepository.findByCustomerId(subscriber.customerId);
    const active = subscriptions.find(
      (s) => s.subscriberId === subscriber.subscriberId && s.status === "ACTIVE"
    );
    return {
      msisdn: normalizedMsisdn,
      subscriberId: subscriber.subscriberId,
      customerId: subscriber.customerId,
      status: subscriber.status,
      activePackage: active?.packageId ?? null,
    };
  },
};

import { packageRepository } from "@/repositories/packageRepository";
import { subscriberRepository } from "@/repositories/subscriberRepository";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";
import { generateSubscriptionId } from "@/lib/ids";
import type {
  AuthToken,
  Package,
  SubscribeRequest,
  SubscriberStatusResult,
  SubscriptionResult,
  UnsubscribeRequest,
  UnsubscribeResult,
} from "@/types";
import type { TelecomProviderAdapter } from "./TelecomProviderAdapter";

/**
 * Simulates the Omantel telecom backend for demo purposes. This stands in for
 * a real provisioning system: it "activates" a line against a package and
 * reports subscriber status. No real network calls are made. See
 * OmantelProviderAdapter.ts for what a production implementation would need.
 */
export class MockOmantelAdapter implements TelecomProviderAdapter {
  async authenticate(): Promise<AuthToken> {
    return {
      access_token: `mock_access_token_${Date.now()}`,
      token_type: "Bearer",
      expires_in: 3600,
    };
  }

  async getPackages(): Promise<Package[]> {
    return packageRepository.listActive();
  }

  async getSubscriberStatus(msisdn: string): Promise<SubscriberStatusResult> {
    const subscriber = subscriberRepository.findActiveByNormalizedMsisdn(msisdn);
    if (!subscriber) {
      return {
        success: true,
        msisdn,
        subscriber_id: null,
        customer_id: null,
        status: "NOT_FOUND",
        active_package: null,
      };
    }

    const activeSubscription = subscriptionRepository
      .findByCustomerId(subscriber.customerId)
      .find((s) => s.subscriberId === subscriber.subscriberId && s.status === "ACTIVE");

    return {
      success: true,
      msisdn,
      subscriber_id: subscriber.subscriberId,
      customer_id: subscriber.customerId,
      status: subscriber.status,
      active_package: activeSubscription?.packageId ?? null,
    };
  }

  async subscribe(request: SubscribeRequest): Promise<SubscriptionResult> {
    const pkg = packageRepository.findByPackageId(request.packageId);
    if (!pkg || pkg.status !== "ACTIVE") {
      return {
        success: false,
        subscription_id: "",
        subscriber_id: request.subscriberId,
        msisdn: request.msisdn,
        package_id: request.packageId,
        status: "FAILED",
        price: 0,
        currency: "OMR",
        activated_at: "",
        error: "PACKAGE_UNAVAILABLE",
      };
    }

    const now = new Date();
    const activatedAt = now.toISOString();

    return {
      success: true,
      subscription_id: generateSubscriptionId(),
      subscriber_id: request.subscriberId,
      msisdn: request.msisdn,
      package_id: request.packageId,
      status: "ACTIVE",
      price: pkg.price,
      currency: pkg.currency,
      activated_at: activatedAt,
    };
  }

  async unsubscribe(request: UnsubscribeRequest): Promise<UnsubscribeResult> {
    const subscription = subscriptionRepository.findActiveByMsisdnAndPackage(
      request.msisdn,
      request.packageId
    );
    if (!subscription) {
      return { success: false, subscription_id: null, status: "NOT_FOUND", cancelled_at: null };
    }
    return {
      success: true,
      subscription_id: subscription.subscriptionId,
      status: "CANCELLED",
      cancelled_at: new Date().toISOString(),
    };
  }
}

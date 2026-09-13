import type {
  AuthToken,
  Package,
  SubscribeRequest,
  SubscriberStatusResult,
  SubscriptionResult,
  UnsubscribeRequest,
  UnsubscribeResult,
} from "@/types";

/**
 * Integration contract between ATHARX's subscription service and a telecom
 * provider. The service layer depends ONLY on this interface, never on a
 * concrete implementation, so the mock adapter used for this demo can be
 * swapped for a real Omantel adapter later without touching business logic.
 */
export interface TelecomProviderAdapter {
  authenticate(): Promise<AuthToken>;
  getPackages(): Promise<Package[]>;
  getSubscriberStatus(msisdn: string): Promise<SubscriberStatusResult>;
  subscribe(request: SubscribeRequest): Promise<SubscriptionResult>;
  unsubscribe(request: UnsubscribeRequest): Promise<UnsubscribeResult>;
}

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
 * Placeholder for the real Omantel integration. This is intentionally NOT
 * implemented against any fabricated production endpoint — ATHARX has no
 * official connection to Omantel systems today. Wiring this up requires
 * Omantel to provide, at minimum:
 *
 *  - An authentication mechanism (OAuth2 client credentials, mTLS, or an
 *    API-key scheme) and a staging environment to test against.
 *  - A package/catalog endpoint returning live prepaid plan data.
 *  - A subscriber lookup endpoint keyed by MSISDN.
 *  - A subscription provisioning endpoint with clearly documented success/
 *    failure codes and expected latency/SLA.
 *  - An unsubscribe/deprovisioning endpoint.
 *  - Formal request/response schemas and error taxonomies.
 *  - Rate limits and idempotency semantics for provisioning calls.
 *  - Webhook or event notifications for asynchronous provisioning outcomes.
 *  - Production credentials issued through a secure secrets process (never
 *    committed to source control).
 *
 * Once those are available, implement each method below to call the real
 * Omantel endpoints and swap OMANTEL_API_MODE from "mock" to "production" —
 * no changes to the ATHARX service layer are required because it only
 * depends on the TelecomProviderAdapter interface.
 */
export class OmantelProviderAdapter implements TelecomProviderAdapter {
  authenticate(): Promise<AuthToken> {
    throw new NotImplementedError();
  }
  getPackages(): Promise<Package[]> {
    throw new NotImplementedError();
  }
  getSubscriberStatus(_msisdn: string): Promise<SubscriberStatusResult> {
    throw new NotImplementedError();
  }
  subscribe(_request: SubscribeRequest): Promise<SubscriptionResult> {
    throw new NotImplementedError();
  }
  unsubscribe(_request: UnsubscribeRequest): Promise<UnsubscribeResult> {
    throw new NotImplementedError();
  }
}

class NotImplementedError extends Error {
  constructor() {
    super(
      "OmantelProviderAdapter is a production placeholder. Set OMANTEL_API_MODE=mock until real Omantel credentials and endpoints are available."
    );
    this.name = "NotImplementedError";
  }
}

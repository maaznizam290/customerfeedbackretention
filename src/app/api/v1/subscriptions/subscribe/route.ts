import crypto from "node:crypto";
import { runApiRoute } from "@/lib/apiResponse";
import { subscriptionService } from "@/services/subscriptionService";
import { analyticsService } from "@/services/analyticsService";
import { getSessionCustomerId, setSessionCookie } from "@/lib/session";
import { z } from "zod";

const bodySchema = z.object({
  customer_name: z.string().trim().min(2, "Please enter the consumer name."),
  msisdn: z.string().trim().min(1, "Please enter a mobile number."),
  package_id: z.string().trim().min(1),
  subscriber_id: z.string().trim().optional(),
  idempotency_key: z.string().trim().min(1).optional(),
});

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/subscriptions/subscribe",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = bodySchema.parse(raw);
      const idempotencyKey = body.idempotency_key || `REQ-${crypto.randomUUID()}`;

      analyticsService.track("subscription_started", { metadata: { packageId: body.package_id } });

      try {
        const result = await subscriptionService.subscribe({
          consumerName: body.customer_name,
          mobile: body.msisdn,
          packageId: body.package_id,
          idempotencyKey,
        });

        analyticsService.track(
          result.subscription.status === "ACTIVE" ? "subscription_completed" : "subscription_failed",
          {
            customerId: result.subscription.customerId,
            subscriberId: result.subscriber.subscriberId,
            metadata: { packageId: body.package_id, isReplay: result.isReplay },
          }
        );

        // A visitor who subscribes without an existing ATHARX session (e.g.
        // browsing before signing up) gets one established here, pointing at
        // the customer resolved/provisioned for their MSISDN, so their new
        // Coin balance shows up in the navbar and survives a refresh.
        const existingSession = await getSessionCustomerId();
        if (!existingSession) {
          await setSessionCookie(result.subscription.customerId);
        }

        return {
          status: 201,
          requestPayload: raw,
          customerIdForLog: result.subscription.customerId,
          msisdnForLog: result.subscription.msisdn,
          body: {
            success: true,
            subscription_id: result.subscription.subscriptionId,
            subscriber_id: result.subscriber.subscriberId,
            customer_id: result.subscription.customerId,
            msisdn: result.subscription.msisdn,
            package_id: result.subscription.packageId,
            status: result.subscription.status,
            price: result.subscription.price,
            currency: result.subscription.currency,
            activated_at: result.subscription.activatedAt,
            reward: result.reward
              ? { coins: result.reward.coins, status: result.reward.status }
              : { coins: 0, status: "NONE" },
            coin_balance: result.balanceAfter,
            vip_just_reached: result.vipJustReached,
            is_replay: result.isReplay,
          },
        };
      } catch (error) {
        analyticsService.track("subscription_failed", { metadata: { packageId: body.package_id } });
        throw error;
      }
    },
  });
}

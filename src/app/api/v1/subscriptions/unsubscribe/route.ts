import { runApiRoute } from "@/lib/apiResponse";
import { subscriptionService } from "@/services/subscriptionService";
import { unsubscribeSchema } from "@/validations/schemas";

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/subscriptions/unsubscribe",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = unsubscribeSchema.parse({
        msisdn: raw.msisdn,
        packageId: raw.package_id,
        reason: raw.reason,
        idempotencyKey: raw.idempotency_key,
      });

      const result = await subscriptionService.unsubscribe({
        msisdn: body.msisdn,
        packageId: body.packageId,
        reason: body.reason,
      });

      return {
        status: 200,
        requestPayload: raw,
        msisdnForLog: body.msisdn,
        body: {
          success: result.success,
          subscription_id: result.subscription_id,
          status: result.status,
          cancelled_at: result.cancelled_at,
        },
      };
    },
  });
}

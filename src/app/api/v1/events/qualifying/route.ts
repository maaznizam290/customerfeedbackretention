import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { behaviourEventService } from "@/services/behaviourEventService";
import { customerService } from "@/services/customerService";
import { AppError } from "@/lib/errors";

const bodySchema = z.object({
  enterprise_id: z.string().trim().min(1),
  customer_id: z.string().trim().min(1),
  subscriber_id: z.string().trim().optional(),
  event_type: z.string().trim().min(1),
  amount: z.number().optional(),
  currency: z.string().optional(),
  package_id: z.string().trim().optional(),
  timestamp: z.string().optional(),
  // The caller's own upstream event id, used as ATHAR-X's idempotency key
  // (spec §13): resubmitting the same value returns the original outcome
  // instead of reprocessing. Optional — a caller with no upstream id of its
  // own (e.g. an ad hoc admin test) gets no dedup protection.
  idempotency_key: z.string().trim().min(1).optional(),
});

/**
 * The generic qualifying-behaviour ingestion endpoint (§47 of the brief).
 * This is the exact same pipeline the admin Simulator drives — an enterprise
 * (or, in this prototype, the Simulator standing in for one) reports a
 * customer behaviour; ATHARX decides whether it qualifies for an active
 * campaign and, if so, issues a Token and credits Coins.
 */
export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/events/qualifying",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = bodySchema.parse(raw);

      const customer = customerService.getByCustomerId(body.customer_id);
      if (!customer) {
        throw new AppError("Unknown customer_id.", 404, "CUSTOMER_NOT_FOUND");
      }

      const payload: Record<string, unknown> = {};
      if (body.amount !== undefined) payload.amount = body.amount;
      if (body.currency !== undefined) payload.currency = body.currency;
      if (body.package_id !== undefined) payload.package_id = body.package_id;

      const result = behaviourEventService.processEvent({
        enterpriseId: body.enterprise_id,
        customerId: body.customer_id,
        subscriberId: body.subscriber_id ?? null,
        eventType: body.event_type,
        payload,
        timestamp: body.timestamp,
        idempotencyKey: body.idempotency_key ?? null,
      });

      return {
        status: result.isReplay ? 200 : 201,
        requestPayload: raw,
        customerIdForLog: body.customer_id,
        body: {
          success: true,
          is_replay: result.isReplay,
          qualified: result.qualified,
          campaign_id: result.campaign?.campaignId ?? null,
          token_id: result.token?.tokenId ?? null,
          coin_reward: result.coinReward,
          status: result.event.status,
          reason: result.reason,
        },
      };
    },
  });
}

import crypto from "node:crypto";
import { runApiRoute } from "@/lib/apiResponse";
import { spinService } from "@/services/spinService";
import { rewardService } from "@/services/rewardService";
import { analyticsService } from "@/services/analyticsService";
import { spinExecuteSchema } from "@/validations/schemas";

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/spin",
    method: "POST",
    handler: async () => {
      const raw = await request.json();
      // Any client-supplied reward amount is intentionally ignored: the
      // server is the sole authority on how many Coins a spin is worth.
      const body = spinExecuteSchema.parse(raw);
      const idempotencyKey = body.idempotency_key || `SPIN-REQ-${crypto.randomUUID()}`;

      analyticsService.track("spin_started", { customerId: body.customer_id });

      const spin = spinService.executeSpin({
        customerId: body.customer_id,
        subscriberId: body.subscriber_id ?? null,
        idempotencyKey,
      });

      analyticsService.track("spin_completed", { customerId: body.customer_id, metadata: { spinId: spin.spinId } });
      analyticsService.track("spin_reward_credited", {
        customerId: body.customer_id,
        metadata: { coins: spin.rewardCoins },
      });

      return {
        status: 201,
        requestPayload: raw,
        customerIdForLog: body.customer_id,
        body: {
          success: true,
          spin_id: spin.spinId,
          status: spin.spinStatus,
          landed_segment: spin.landedSegment,
          reward: { type: "COIN", amount: spin.rewardCoins },
          coin_balance: rewardService.getBalance(body.customer_id),
          last_spin_at: spin.lastSpinAt,
          next_spin_available_at: spin.nextSpinAvailableAt,
          cooldown_seconds: Math.round(
            (new Date(spin.nextSpinAvailableAt).getTime() - new Date(spin.lastSpinAt).getTime()) / 1000
          ),
        },
      };
    },
  });
}

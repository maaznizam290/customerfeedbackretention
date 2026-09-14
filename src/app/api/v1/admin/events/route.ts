import { runApiRoute } from "@/lib/apiResponse";
import { behaviourEventRepository } from "@/repositories/behaviourEventRepository";
import { customerService } from "@/services/customerService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/events",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const url = new URL(request.url);
      const customerId = url.searchParams.get("customer_id");
      const events = customerId
        ? behaviourEventRepository.listByCustomer(customerId, 20)
        : behaviourEventRepository.listRecent(30);

      return {
        status: 200,
        body: {
          events: events.map((e) => ({
            event_id: e.eventId,
            customer_id: e.customerId,
            customer_name: customerService.getByCustomerId(e.customerId)?.fullName ?? null,
            behavior_id: e.behaviorId,
            event_type: e.eventType,
            payload: e.payload,
            qualified: e.qualified,
            campaign_id: e.campaignId,
            token_id: e.tokenId,
            coin_reward: e.coinReward,
            status: e.status,
            created_at: e.createdAt,
          })),
        },
      };
    },
  });
}

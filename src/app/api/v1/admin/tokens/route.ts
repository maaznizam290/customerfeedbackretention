import { runApiRoute } from "@/lib/apiResponse";
import { tokenService } from "@/services/tokenService";
import { customerService } from "@/services/customerService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/tokens",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const url = new URL(request.url);
      const tokens = tokenService.search({
        campaignId: url.searchParams.get("campaign_id") ?? undefined,
        customerId: url.searchParams.get("customer_id") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
      });
      return {
        status: 200,
        body: {
          tokens: tokens.map((t) => {
            const customer = customerService.getByCustomerId(t.customerId);
            return {
              token_id: t.tokenId,
              enterprise_id: t.enterpriseId,
              customer_id: t.customerId,
              customer_name: customer?.fullName ?? null,
              subscriber_id: t.subscriberId,
              campaign_id: t.campaignId,
              behaviour_event_id: t.behaviourEventId,
              status: t.status,
              issued_at: t.issuedAt,
            };
          }),
        },
      };
    },
  });
}

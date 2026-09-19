import { runApiRoute } from "@/lib/apiResponse";
import { auditService } from "@/services/auditService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/audit",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const url = new URL(request.url);
      const entries = auditService.search({
        eventType: url.searchParams.get("event_type") ?? undefined,
        campaignId: url.searchParams.get("campaign_id") ?? undefined,
        customerId: url.searchParams.get("customer_id") ?? undefined,
      });
      return {
        status: 200,
        body: {
          entries: entries.map((e) => ({
            audit_id: e.auditId,
            event_type: e.eventType,
            enterprise_id: e.enterpriseId,
            campaign_id: e.campaignId,
            customer_id: e.customerId,
            token_id: e.tokenId,
            actor: e.actor,
            before_value: e.beforeValue,
            after_value: e.afterValue,
            created_at: e.createdAt,
          })),
        },
      };
    },
  });
}

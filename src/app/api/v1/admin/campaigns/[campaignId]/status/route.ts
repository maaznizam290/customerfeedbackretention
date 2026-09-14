import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { campaignService } from "@/services/campaignService";

const bodySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "CLOSED", "COMPLETED"]),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/admin/campaigns/{campaign_id}/status",
    method: "PATCH",
    requireAuth: false,
    handler: async () => {
      const { campaignId } = await params;
      const raw = await request.json();
      const body = bodySchema.parse(raw);
      const campaign = campaignService.setStatus(campaignId, body.status);
      return {
        status: 200,
        requestPayload: raw,
        body: { success: true, campaign_id: campaign.campaignId, status: campaign.status },
      };
    },
  });
}

import { runApiRoute } from "@/lib/apiResponse";
import { selectionService } from "@/services/selectionService";

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/admin/selection/{campaign_id}/lock",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const { campaignId } = await params;
      const run = selectionService.lockEligiblePool(campaignId);
      return {
        status: 201,
        body: {
          success: true,
          run_id: run.runId,
          eligible_count: run.eligibleCount,
          eligible_pool_hash: run.eligiblePoolHash,
          locked_at: run.lockedAt,
        },
      };
    },
  });
}

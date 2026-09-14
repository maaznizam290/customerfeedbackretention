import { runApiRoute } from "@/lib/apiResponse";
import { selectionService } from "@/services/selectionService";
import { customerService } from "@/services/customerService";

export async function POST(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/admin/selection/{campaign_id}/execute",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const { campaignId } = await params;
      const { run, results } = selectionService.executeSelection(campaignId);
      return {
        status: 201,
        body: {
          success: true,
          run_id: run.runId,
          eligible_count: run.eligibleCount,
          selected_count: run.selectedCount,
          results: results.map((r) => ({
            token_id: r.tokenId,
            customer_id: r.customerId,
            customer_name: customerService.getByCustomerId(r.customerId)?.fullName ?? null,
            rank: r.rank,
          })),
        },
      };
    },
  });
}

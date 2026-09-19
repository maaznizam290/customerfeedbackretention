import { runApiRoute } from "@/lib/apiResponse";
import { selectionService } from "@/services/selectionService";
import { campaignService } from "@/services/campaignService";
import { customerService } from "@/services/customerService";

export async function GET(request: Request, { params }: { params: Promise<{ campaignId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/admin/selection/{campaign_id}",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const { campaignId } = await params;
      const campaign = campaignService.getByCampaignId(campaignId);
      const run = selectionService.getRunForCampaign(campaignId);
      const results = run ? selectionService.getResultsForRun(run.runId) : [];

      return {
        status: 200,
        body: {
          campaign_id: campaignId,
          campaign_status: campaign?.status ?? null,
          eligible_tokens: campaignService.tokensIssued(campaignId),
          run: run
            ? {
                run_id: run.runId,
                eligible_count: run.eligibleCount,
                selected_count: run.selectedCount,
                eligible_pool_hash: run.eligiblePoolHash,
                locked_at: run.lockedAt,
                executed_at: run.executedAt,
                executed_by: run.executedBy,
                algorithm_version: run.algorithmVersion,
                status: run.status,
                audit_reference: run.auditReference,
              }
            : null,
          results: results.map((r) => ({
            result_id: r.resultId,
            token_id: r.tokenId,
            customer_id: r.customerId,
            customer_name: customerService.getByCustomerId(r.customerId)?.fullName ?? null,
            rank: r.rank,
            status: r.status,
            selected_at: r.selectedAt,
          })),
        },
      };
    },
  });
}

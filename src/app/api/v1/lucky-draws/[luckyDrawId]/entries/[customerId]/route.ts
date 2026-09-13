import { runApiRoute } from "@/lib/apiResponse";
import { luckyDrawService } from "@/services/luckyDrawService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ luckyDrawId: string; customerId: string }> }
) {
  return runApiRoute({
    request,
    endpoint: "/lucky-draws/{lucky_draw_id}/entries/{customer_id}",
    method: "GET",
    handler: async () => {
      const { luckyDrawId, customerId } = await params;
      const entries = luckyDrawService.getEntries(luckyDrawId, customerId);
      return {
        status: 200,
        customerIdForLog: customerId,
        body: {
          lucky_draw_id: luckyDrawId,
          customer_id: customerId,
          entries: entries.map((e) => ({
            entry_id: e.entryId,
            entry_number: e.entryNumber,
            source: e.source,
            eligibility_status: e.eligibilityStatus,
            created_at: e.createdAt,
          })),
        },
      };
    },
  });
}

import { runApiRoute } from "@/lib/apiResponse";
import { luckyDrawService } from "@/services/luckyDrawService";
import { analyticsService } from "@/services/analyticsService";
import { luckyDrawEntrySchema } from "@/validations/schemas";
import { AppError } from "@/lib/errors";

export async function POST(request: Request, { params }: { params: Promise<{ luckyDrawId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/lucky-draws/{lucky_draw_id}/entries",
    method: "POST",
    handler: async () => {
      const raw = await request.json();
      const body = luckyDrawEntrySchema.parse(raw);
      const { luckyDrawId } = await params;

      const result = luckyDrawService.createManualEntry(luckyDrawId, body.customer_id);
      if (!result.entry) {
        const reason = result.reason ?? "UNKNOWN";
        const status = reason === "INSUFFICIENT_COINS" ? 403 : reason === "ALREADY_ENTERED" ? 409 : 404;
        throw new AppError(
          reason === "INSUFFICIENT_COINS"
            ? "You do not have enough Coins to enter this lucky draw yet."
            : reason === "ALREADY_ENTERED"
              ? "You already have an entry for this lucky draw."
              : "Lucky draw not found.",
          status,
          reason
        );
      }

      analyticsService.track("lucky_draw_entry_created", {
        customerId: body.customer_id,
        metadata: { luckyDrawId },
      });

      return {
        status: 201,
        requestPayload: raw,
        customerIdForLog: body.customer_id,
        body: {
          success: true,
          entry_id: result.entry.entryId,
          lucky_draw_id: result.entry.luckyDrawId,
          entry_number: result.entry.entryNumber,
          eligibility_status: result.entry.eligibilityStatus,
        },
      };
    },
  });
}

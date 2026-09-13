import { runApiRoute } from "@/lib/apiResponse";
import { luckyDrawService } from "@/services/luckyDrawService";
import { AppError } from "@/lib/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ luckyDrawId: string; customerId: string }> }
) {
  return runApiRoute({
    request,
    endpoint: "/lucky-draws/{lucky_draw_id}/eligibility/{customer_id}",
    method: "GET",
    handler: async () => {
      const { luckyDrawId, customerId } = await params;
      const eligibility = luckyDrawService.checkEligibility(luckyDrawId, customerId);
      if (!eligibility) {
        throw new AppError("Lucky draw not found.", 404, "LUCKY_DRAW_NOT_FOUND");
      }
      return {
        status: 200,
        customerIdForLog: customerId,
        body: {
          eligible: eligibility.eligible,
          lucky_draw_id: eligibility.luckyDrawId,
          minimum_coins: eligibility.minimumCoins,
          balance: eligibility.balance,
          coins_remaining: eligibility.coinsRemaining,
          entries: eligibility.entries,
        },
      };
    },
  });
}

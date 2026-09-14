import { runApiRoute } from "@/lib/apiResponse";
import { vaultService } from "@/services/vaultService";
import { vaultRedeemSchema } from "@/validations/schemas";
import { analyticsService } from "@/services/analyticsService";

export async function POST(request: Request, { params }: { params: Promise<{ offerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/vault/{offer_id}/redeem",
    method: "POST",
    handler: async () => {
      const raw = await request.json();
      const body = vaultRedeemSchema.parse(raw);
      const { offerId } = await params;

      const result = vaultService.redeem(body.customer_id, offerId);

      if (!result.alreadyRedeemed) {
        analyticsService.track("vault_offer_redeemed", {
          customerId: body.customer_id,
          metadata: { offerId, coinsSpent: result.redemption.coinsSpent },
        });
      }

      return {
        status: result.alreadyRedeemed ? 200 : 201,
        requestPayload: raw,
        customerIdForLog: body.customer_id,
        body: {
          success: true,
          already_redeemed: result.alreadyRedeemed,
          redemption_id: result.redemption.redemptionId,
          offer_id: result.redemption.offerId,
          voucher_code: result.redemption.voucherCode,
          coins_spent: result.redemption.coinsSpent,
          coin_balance: result.coinBalance,
        },
      };
    },
  });
}

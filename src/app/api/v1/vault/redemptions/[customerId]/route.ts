import { runApiRoute } from "@/lib/apiResponse";
import { vaultService } from "@/services/vaultService";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/vault/redemptions/{customer_id}",
    method: "GET",
    handler: async () => {
      const { customerId } = await params;
      const redemptions = vaultService.getRedemptionsForCustomer(customerId);
      return {
        status: 200,
        customerIdForLog: customerId,
        body: {
          redemptions: redemptions.map((r) => ({
            redemption_id: r.redemptionId,
            offer_id: r.offerId,
            coins_spent: r.coinsSpent,
            voucher_code: r.voucherCode,
            redeemed_at: r.redeemedAt,
          })),
        },
      };
    },
  });
}

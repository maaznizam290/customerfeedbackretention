import { runApiRoute } from "@/lib/apiResponse";
import { vaultService } from "@/services/vaultService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/vault",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const offers = vaultService.listActive();
      return {
        status: 200,
        body: {
          offers: offers.map((o) => ({
            offer_id: o.offerId,
            partner_name: o.partnerName,
            category: o.category,
            city: o.city,
            icon: o.icon,
            discount_percent: o.discountPercent,
            description: o.description,
            coin_cost: o.coinCost,
            demo_partner: o.demoPartner,
            status: o.status,
          })),
        },
      };
    },
  });
}

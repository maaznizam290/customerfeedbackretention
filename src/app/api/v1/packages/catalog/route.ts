import { runApiRoute } from "@/lib/apiResponse";
import { packageService } from "@/services/packageService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/packages/catalog",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const packages = packageService.listActive();
      return {
        status: 200,
        body: {
          success: true,
          source: "mock_omantel",
          currency: "OMR",
          packages: packages.map((p) => ({
            package_id: p.packageId,
            name: p.name,
            description: p.description,
            price: p.price,
            currency: p.currency,
            local_minutes: p.localMinutes,
            data_gb: p.dataGb,
            sms: p.sms,
            validity_days: p.validityDays,
            campaign_reward_coins: p.campaignRewardCoins,
            badge: p.badge,
            status: p.status,
          })),
        },
      };
    },
  });
}

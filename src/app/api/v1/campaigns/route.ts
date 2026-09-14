import { runApiRoute } from "@/lib/apiResponse";
import { campaignService } from "@/services/campaignService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/campaigns",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const campaigns = campaignService.listActive();
      return {
        status: 200,
        body: {
          campaigns: campaigns.map((c) => ({
            campaign_id: c.campaignId,
            name: c.name,
            category: c.category,
            campaign_type: c.campaignType,
            description: c.description,
            eligibility: c.eligibility,
            reward_type: c.rewardType,
            reward_coins: c.rewardCoins,
            experience_title: c.experienceTitle,
            experience_description: c.experienceDescription,
            token_capacity: c.tokenCapacity,
            tokens_issued: campaignService.tokensIssued(c.campaignId),
            package_id: c.packageId,
            status: c.status,
          })),
        },
      };
    },
  });
}

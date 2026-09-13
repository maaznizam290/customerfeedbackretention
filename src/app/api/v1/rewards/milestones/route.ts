import { runApiRoute } from "@/lib/apiResponse";
import { milestoneService } from "@/services/milestoneService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/rewards/milestones",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const milestones = milestoneService.listActive();
      return {
        status: 200,
        body: {
          milestones: milestones.map((m) => ({
            milestone_id: m.milestoneId,
            name: m.name,
            required_coins: m.requiredCoins,
            reward_type: m.rewardType,
            reward_title: m.rewardTitle,
            description: m.description,
            status: m.status,
          })),
        },
      };
    },
  });
}

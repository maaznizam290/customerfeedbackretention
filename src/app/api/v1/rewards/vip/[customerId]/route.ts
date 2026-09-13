import { runApiRoute } from "@/lib/apiResponse";
import { milestoneService } from "@/services/milestoneService";
import { AppError } from "@/lib/errors";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/rewards/vip/{customer_id}",
    method: "GET",
    handler: async () => {
      const { customerId } = await params;
      const progress = milestoneService.getVipProgress(customerId);
      if (!progress) {
        throw new AppError("No VIP milestone is currently configured.", 404, "MILESTONE_NOT_FOUND");
      }
      return {
        status: 200,
        customerIdForLog: customerId,
        body: {
          customer_id: customerId,
          milestone_id: progress.milestone.milestoneId,
          reward_title: progress.milestone.rewardTitle,
          required_coins: progress.requiredCoins,
          balance: progress.balance,
          coins_remaining: progress.coinsRemaining,
          progress_percent: progress.progressPercent,
          status: progress.status,
        },
      };
    },
  });
}

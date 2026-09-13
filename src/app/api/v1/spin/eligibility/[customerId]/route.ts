import { runApiRoute } from "@/lib/apiResponse";
import { spinService } from "@/services/spinService";
import { analyticsService } from "@/services/analyticsService";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/spin/eligibility/{customer_id}",
    method: "GET",
    handler: async () => {
      const { customerId } = await params;
      const eligibility = spinService.getEligibility(customerId);
      analyticsService.track("spin_page_viewed", { customerId });
      return {
        status: 200,
        customerIdForLog: customerId,
        body: {
          eligible: eligibility.eligible,
          campaign_id: eligibility.campaignId,
          reward_coins: eligibility.rewardCoins,
          cooldown_active: eligibility.cooldownActive,
          last_spin_at: eligibility.lastSpinAt,
          next_spin_available_at: eligibility.nextSpinAvailableAt,
          remaining_cooldown_seconds: eligibility.remainingCooldownSeconds,
          remaining_spins: eligibility.eligible ? 1 : 0,
        },
      };
    },
  });
}

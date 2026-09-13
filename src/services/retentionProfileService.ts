import { rewardService } from "@/services/rewardService";
import { subscriptionRepository } from "@/repositories/subscriptionRepository";

export interface RetentionProfile {
  customer_id: string;
  coins_balance: number;
  subscriptions_active: number;
  churn_probability: null;
  risk_segment: null;
  recommended_campaign: null;
  recommended_reward_coins: null;
  note: string;
}

/**
 * Interface/service boundary for a future churn-prediction model. The MVP
 * intentionally does NOT compute a real probability — this simply exposes
 * the shape a BI/ML service could populate later (see
 * docs/ARCHITECTURE.md "Future AI/BI Architecture").
 */
export const retentionProfileService = {
  getProfile(customerId: string): RetentionProfile {
    const subscriptions = subscriptionRepository.findByCustomerId(customerId);
    return {
      customer_id: customerId,
      coins_balance: rewardService.getBalance(customerId),
      subscriptions_active: subscriptions.filter((s) => s.status === "ACTIVE").length,
      churn_probability: null,
      risk_segment: null,
      recommended_campaign: null,
      recommended_reward_coins: null,
      note: "Predictive fields are placeholders. This MVP does not run a churn model; a future BI/ML service would populate churn_probability, risk_segment and recommended_campaign here.",
    };
  },
};

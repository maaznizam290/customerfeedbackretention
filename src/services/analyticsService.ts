import { analyticsRepository } from "@/repositories/analyticsRepository";
import { generateEventId } from "@/lib/ids";

// Event names future BI/churn tooling will consume. Keep this list in sync
// with docs/ARCHITECTURE.md "Analytics Events" section.
export type AnalyticsEventName =
  | "signup_started"
  | "signup_completed"
  | "reward_awarded"
  | "campaign_viewed"
  | "campaign_clicked"
  | "package_viewed"
  | "package_selected"
  | "subscription_started"
  | "subscription_completed"
  | "subscription_failed"
  | "reward_viewed"
  | "referral_started"
  | "referral_completed"
  | "vip_progress_viewed"
  | "vip_milestone_reached"
  | "lucky_draw_viewed"
  | "lucky_draw_entry_created"
  | "spin_page_viewed"
  | "spin_started"
  | "spin_completed"
  | "spin_reward_credited"
  | "spin_ineligible"
  | "spin_failed";

export const analyticsService = {
  track(
    eventName: AnalyticsEventName,
    context: { customerId?: string | null; subscriberId?: string | null; metadata?: Record<string, unknown> }
  ) {
    analyticsRepository.record({
      eventId: generateEventId(),
      customerId: context.customerId ?? null,
      subscriberId: context.subscriberId ?? null,
      eventName,
      metadata: context.metadata ?? {},
    });
  },
};

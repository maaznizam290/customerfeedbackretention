import { auditRepository } from "@/repositories/auditRepository";
import { generateAuditId } from "@/lib/ids";
import type { AuditEventType, AuditLogEntry } from "@/types";

/**
 * The single, centralized audit trail (spec §28/§42): every
 * integrity-relevant action across the platform — campaign lifecycle,
 * event ingestion, token issuance, selection/pool-lock/winner outcomes —
 * writes exactly one row here, and ONLY through this service. No other
 * write path to `audit_log` exists, so the trail can never be silently
 * bypassed by a route/service that forgets to log while another does.
 * Deliberately separate from `analyticsService` (a product-analytics/UI
 * funnel feed with no admin-actor attribution, no before/after values, and
 * no compliance guarantee).
 */
export const auditService = {
  record(input: {
    eventType: AuditEventType;
    enterpriseId?: string | null;
    campaignId?: string | null;
    customerId?: string | null;
    tokenId?: string | null;
    actor?: string;
    beforeValue?: Record<string, unknown> | null;
    afterValue?: Record<string, unknown> | null;
  }): AuditLogEntry {
    return auditRepository.create({
      auditId: generateAuditId(),
      eventType: input.eventType,
      enterpriseId: input.enterpriseId ?? null,
      campaignId: input.campaignId ?? null,
      customerId: input.customerId ?? null,
      tokenId: input.tokenId ?? null,
      actor: input.actor ?? "SYSTEM",
      beforeValue: input.beforeValue ?? null,
      afterValue: input.afterValue ?? null,
    });
  },

  search(filters: { eventType?: string; campaignId?: string; customerId?: string }): AuditLogEntry[] {
    return auditRepository.search(filters);
  },
};

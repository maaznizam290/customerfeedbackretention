import { getDb } from "@/lib/db";
import type { AuditEventType, AuditLogEntry } from "@/types";

interface Row {
  id: number;
  audit_id: string;
  event_type: string;
  enterprise_id: string | null;
  campaign_id: string | null;
  customer_id: string | null;
  token_id: string | null;
  actor: string;
  before_value: string | null;
  after_value: string | null;
  system_identifier: string;
  created_at: string;
}

function mapRow(row: Row): AuditLogEntry {
  return {
    id: row.id,
    auditId: row.audit_id,
    eventType: row.event_type as AuditEventType,
    enterpriseId: row.enterprise_id,
    campaignId: row.campaign_id,
    customerId: row.customer_id,
    tokenId: row.token_id,
    actor: row.actor,
    beforeValue: row.before_value ? (JSON.parse(row.before_value) as Record<string, unknown>) : null,
    afterValue: row.after_value ? (JSON.parse(row.after_value) as Record<string, unknown>) : null,
    systemIdentifier: row.system_identifier,
    createdAt: row.created_at,
  };
}

export const auditRepository = {
  create(input: {
    auditId: string;
    eventType: AuditEventType;
    enterpriseId?: string | null;
    campaignId?: string | null;
    customerId?: string | null;
    tokenId?: string | null;
    actor: string;
    beforeValue?: Record<string, unknown> | null;
    afterValue?: Record<string, unknown> | null;
  }): AuditLogEntry {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO audit_log
          (audit_id, event_type, enterprise_id, campaign_id, customer_id, token_id, actor, before_value, after_value, system_identifier, created_at)
         VALUES
          (@auditId, @eventType, @enterpriseId, @campaignId, @customerId, @tokenId, @actor, @beforeValue, @afterValue, 'atharx-engine', @now)`
      )
      .run({
        auditId: input.auditId,
        eventType: input.eventType,
        enterpriseId: input.enterpriseId ?? null,
        campaignId: input.campaignId ?? null,
        customerId: input.customerId ?? null,
        tokenId: input.tokenId ?? null,
        actor: input.actor,
        beforeValue: input.beforeValue ? JSON.stringify(input.beforeValue) : null,
        afterValue: input.afterValue ? JSON.stringify(input.afterValue) : null,
        now,
      });
    return this.findById(input.auditId)!;
  },

  findById(auditId: string): AuditLogEntry | null {
    const row = getDb().prepare(`SELECT * FROM audit_log WHERE audit_id = ?`).get(auditId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  search(
    filters: { eventType?: string; campaignId?: string; customerId?: string },
    limit = 200
  ): AuditLogEntry[] {
    const clauses: string[] = [];
    const params: Record<string, string> = {};
    if (filters.eventType) {
      clauses.push("event_type = @eventType");
      params.eventType = filters.eventType;
    }
    if (filters.campaignId) {
      clauses.push("campaign_id = @campaignId");
      params.campaignId = filters.campaignId;
    }
    if (filters.customerId) {
      clauses.push("customer_id = @customerId");
      params.customerId = filters.customerId;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb()
      .prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT ${Math.min(limit, 500)}`)
      .all(params) as Row[];
    return rows.map(mapRow);
  },
};

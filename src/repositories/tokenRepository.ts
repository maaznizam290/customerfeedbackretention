import { getDb } from "@/lib/db";
import type { Token, TokenStatus } from "@/types";

interface Row {
  id: number;
  token_id: string;
  enterprise_id: string;
  customer_id: string;
  subscriber_id: string | null;
  campaign_id: string;
  behaviour_event_id: string | null;
  status: string;
  issued_at: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): Token {
  return {
    id: row.id,
    tokenId: row.token_id,
    enterpriseId: row.enterprise_id,
    customerId: row.customer_id,
    subscriberId: row.subscriber_id,
    campaignId: row.campaign_id,
    behaviourEventId: row.behaviour_event_id,
    status: row.status as TokenStatus,
    issuedAt: row.issued_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const tokenRepository = {
  create(input: {
    tokenId: string;
    enterpriseId: string;
    customerId: string;
    subscriberId: string | null;
    campaignId: string;
    behaviourEventId: string | null;
    issuedAt: string;
  }): Token {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO tokens (token_id, enterprise_id, customer_id, subscriber_id, campaign_id, behaviour_event_id, status, issued_at, created_at, updated_at)
         VALUES (@tokenId, @enterpriseId, @customerId, @subscriberId, @campaignId, @behaviourEventId, 'ISSUED', @issuedAt, @now, @now)`
      )
      .run({ ...input, now });
    return this.findById(input.tokenId)!;
  },

  findById(tokenId: string): Token | null {
    const row = getDb().prepare(`SELECT * FROM tokens WHERE token_id = ?`).get(tokenId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  countForCampaign(campaignId: string): number {
    const row = getDb()
      .prepare(`SELECT COUNT(*) as c FROM tokens WHERE campaign_id = ?`)
      .get(campaignId) as { c: number };
    return row.c;
  },

  listEligibleForCampaign(campaignId: string): Token[] {
    const rows = getDb()
      .prepare(`SELECT * FROM tokens WHERE campaign_id = ? AND status = 'ISSUED' ORDER BY id ASC`)
      .all(campaignId) as Row[];
    return rows.map(mapRow);
  },

  listByCampaign(campaignId: string): Token[] {
    const rows = getDb()
      .prepare(`SELECT * FROM tokens WHERE campaign_id = ? ORDER BY id DESC`)
      .all(campaignId) as Row[];
    return rows.map(mapRow);
  },

  listByCustomer(customerId: string): Token[] {
    const rows = getDb()
      .prepare(`SELECT * FROM tokens WHERE customer_id = ? ORDER BY id DESC`)
      .all(customerId) as Row[];
    return rows.map(mapRow);
  },

  search(filters: { campaignId?: string; customerId?: string; status?: string }, limit = 100): Token[] {
    const clauses: string[] = [];
    const params: Record<string, string> = {};
    if (filters.campaignId) {
      clauses.push("campaign_id = @campaignId");
      params.campaignId = filters.campaignId;
    }
    if (filters.customerId) {
      clauses.push("customer_id = @customerId");
      params.customerId = filters.customerId;
    }
    if (filters.status) {
      clauses.push("status = @status");
      params.status = filters.status;
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb()
      .prepare(`SELECT * FROM tokens ${where} ORDER BY id DESC LIMIT ${Math.min(limit, 500)}`)
      .all(params) as Row[];
    return rows.map(mapRow);
  },

  setStatus(tokenId: string, status: TokenStatus): void {
    getDb()
      .prepare(`UPDATE tokens SET status = ?, updated_at = ? WHERE token_id = ?`)
      .run(status, new Date().toISOString(), tokenId);
  },

  countAll(): number {
    const row = getDb().prepare(`SELECT COUNT(*) as c FROM tokens`).get() as { c: number };
    return row.c;
  },

  countIssuedSince(isoTimestamp: string): number {
    const row = getDb()
      .prepare(`SELECT COUNT(*) as c FROM tokens WHERE issued_at >= ?`)
      .get(isoTimestamp) as { c: number };
    return row.c;
  },
};

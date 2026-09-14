import { getDb } from "@/lib/db";
import type { BehaviourEvent, BehaviourEventStatus } from "@/types";

interface Row {
  id: number;
  event_id: string;
  enterprise_id: string;
  customer_id: string;
  subscriber_id: string | null;
  behavior_id: string | null;
  event_type: string;
  payload: string;
  qualified: number;
  campaign_id: string | null;
  token_id: string | null;
  coin_reward: number;
  status: string;
  created_at: string;
}

function mapRow(row: Row): BehaviourEvent {
  return {
    id: row.id,
    eventId: row.event_id,
    enterpriseId: row.enterprise_id,
    customerId: row.customer_id,
    subscriberId: row.subscriber_id,
    behaviorId: row.behavior_id,
    eventType: row.event_type,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    qualified: !!row.qualified,
    campaignId: row.campaign_id,
    tokenId: row.token_id,
    coinReward: row.coin_reward,
    status: row.status as BehaviourEventStatus,
    createdAt: row.created_at,
  };
}

export const behaviourEventRepository = {
  create(input: {
    eventId: string;
    enterpriseId: string;
    customerId: string;
    subscriberId: string | null;
    behaviorId: string | null;
    eventType: string;
    payload: Record<string, unknown>;
    qualified: boolean;
    campaignId: string | null;
    tokenId: string | null;
    coinReward: number;
    status: BehaviourEventStatus;
  }): BehaviourEvent {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO behaviour_events
          (event_id, enterprise_id, customer_id, subscriber_id, behavior_id, event_type, payload, qualified, campaign_id, token_id, coin_reward, status, created_at)
         VALUES
          (@eventId, @enterpriseId, @customerId, @subscriberId, @behaviorId, @eventType, @payload, @qualified, @campaignId, @tokenId, @coinReward, @status, @now)`
      )
      .run({
        ...input,
        payload: JSON.stringify(input.payload ?? {}),
        qualified: input.qualified ? 1 : 0,
        now,
      });
    return this.findById(input.eventId)!;
  },

  findById(eventId: string): BehaviourEvent | null {
    const row = getDb()
      .prepare(`SELECT * FROM behaviour_events WHERE event_id = ?`)
      .get(eventId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  listByCustomer(customerId: string, limit = 20): BehaviourEvent[] {
    const rows = getDb()
      .prepare(`SELECT * FROM behaviour_events WHERE customer_id = ? ORDER BY id DESC LIMIT ?`)
      .all(customerId, limit) as Row[];
    return rows.map(mapRow);
  },

  listRecent(limit = 50): BehaviourEvent[] {
    const rows = getDb()
      .prepare(`SELECT * FROM behaviour_events ORDER BY id DESC LIMIT ?`)
      .all(limit) as Row[];
    return rows.map(mapRow);
  },

  countQualifiedSince(isoTimestamp: string): number {
    const row = getDb()
      .prepare(`SELECT COUNT(*) as c FROM behaviour_events WHERE qualified = 1 AND created_at >= ?`)
      .get(isoTimestamp) as { c: number };
    return row.c;
  },
};

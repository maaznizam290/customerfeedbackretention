import { getDb } from "@/lib/db";
import type { Subscriber } from "@/types";

interface SubscriberRow {
  id: number;
  subscriber_id: string;
  customer_id: string;
  msisdn: string;
  normalized_msisdn: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SubscriberRow): Subscriber {
  return {
    id: row.id,
    subscriberId: row.subscriber_id,
    customerId: row.customer_id,
    msisdn: row.msisdn,
    normalizedMsisdn: row.normalized_msisdn,
    status: row.status as Subscriber["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const subscriberRepository = {
  create(input: {
    subscriberId: string;
    customerId: string;
    msisdn: string;
    normalizedMsisdn: string;
  }): Subscriber {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO subscribers (subscriber_id, customer_id, msisdn, normalized_msisdn, status, created_at, updated_at)
         VALUES (@subscriberId, @customerId, @msisdn, @normalizedMsisdn, 'ACTIVE', @now, @now)`
      )
      .run({ ...input, now });
    return this.findBySubscriberId(input.subscriberId)!;
  },

  findBySubscriberId(subscriberId: string): Subscriber | null {
    const row = getDb()
      .prepare(`SELECT * FROM subscribers WHERE subscriber_id = ?`)
      .get(subscriberId) as SubscriberRow | undefined;
    return row ? mapRow(row) : null;
  },

  findActiveByNormalizedMsisdn(normalizedMsisdn: string): Subscriber | null {
    const row = getDb()
      .prepare(`SELECT * FROM subscribers WHERE normalized_msisdn = ? AND status = 'ACTIVE'`)
      .get(normalizedMsisdn) as SubscriberRow | undefined;
    return row ? mapRow(row) : null;
  },

  findByCustomerId(customerId: string): Subscriber[] {
    const rows = getDb()
      .prepare(`SELECT * FROM subscribers WHERE customer_id = ? ORDER BY id ASC`)
      .all(customerId) as SubscriberRow[];
    return rows.map(mapRow);
  },
};

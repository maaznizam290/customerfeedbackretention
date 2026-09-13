import { getDb } from "@/lib/db";
import type { Subscription } from "@/types";

interface SubscriptionRow {
  id: number;
  subscription_id: string;
  customer_id: string;
  subscriber_id: string;
  package_id: string;
  msisdn: string;
  price: number;
  currency: string;
  status: string;
  idempotency_key: string;
  activated_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    subscriptionId: row.subscription_id,
    customerId: row.customer_id,
    subscriberId: row.subscriber_id,
    packageId: row.package_id,
    msisdn: row.msisdn,
    price: row.price,
    currency: row.currency as "OMR",
    status: row.status as Subscription["status"],
    idempotencyKey: row.idempotency_key,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const subscriptionRepository = {
  create(input: {
    subscriptionId: string;
    customerId: string;
    subscriberId: string;
    packageId: string;
    msisdn: string;
    price: number;
    currency: string;
    status: Subscription["status"];
    idempotencyKey: string;
    activatedAt: string | null;
    expiresAt: string | null;
  }): Subscription {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO subscriptions
          (subscription_id, customer_id, subscriber_id, package_id, msisdn, price, currency, status, idempotency_key, activated_at, expires_at, created_at, updated_at)
         VALUES
          (@subscriptionId, @customerId, @subscriberId, @packageId, @msisdn, @price, @currency, @status, @idempotencyKey, @activatedAt, @expiresAt, @now, @now)`
      )
      .run({ ...input, now });
    return this.findBySubscriptionId(input.subscriptionId)!;
  },

  findBySubscriptionId(subscriptionId: string): Subscription | null {
    const row = getDb()
      .prepare(`SELECT * FROM subscriptions WHERE subscription_id = ?`)
      .get(subscriptionId) as SubscriptionRow | undefined;
    return row ? mapRow(row) : null;
  },

  findByIdempotencyKey(key: string): Subscription | null {
    const row = getDb()
      .prepare(`SELECT * FROM subscriptions WHERE idempotency_key = ?`)
      .get(key) as SubscriptionRow | undefined;
    return row ? mapRow(row) : null;
  },

  findActiveByMsisdnAndPackage(msisdn: string, packageId: string): Subscription | null {
    const row = getDb()
      .prepare(
        `SELECT * FROM subscriptions WHERE msisdn = ? AND package_id = ? AND status = 'ACTIVE' ORDER BY id DESC LIMIT 1`
      )
      .get(msisdn, packageId) as SubscriptionRow | undefined;
    return row ? mapRow(row) : null;
  },

  findByCustomerId(customerId: string): Subscription[] {
    const rows = getDb()
      .prepare(`SELECT * FROM subscriptions WHERE customer_id = ? ORDER BY id DESC`)
      .all(customerId) as SubscriptionRow[];
    return rows.map(mapRow);
  },

  cancel(subscriptionId: string): Subscription | null {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `UPDATE subscriptions SET status = 'CANCELLED', cancelled_at = @now, updated_at = @now WHERE subscription_id = @subscriptionId`
      )
      .run({ subscriptionId, now });
    return this.findBySubscriptionId(subscriptionId);
  },

  listAll(): Subscription[] {
    const rows = getDb().prepare(`SELECT * FROM subscriptions ORDER BY id DESC`).all() as SubscriptionRow[];
    return rows.map(mapRow);
  },
};

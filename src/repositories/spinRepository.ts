import { getDb } from "@/lib/db";
import type { SpinCampaign, SpinTransaction } from "@/types";

interface CampaignRow {
  id: number;
  spin_campaign_id: string;
  name: string;
  status: string;
  spin_frequency: string;
  reward_coins: number;
  cooldown_seconds: number;
  max_spins_per_customer: number | null;
  start_date: string;
  end_date: string | null;
}

function mapCampaign(row: CampaignRow): SpinCampaign {
  return {
    id: row.id,
    spinCampaignId: row.spin_campaign_id,
    name: row.name,
    status: row.status as SpinCampaign["status"],
    spinFrequency: row.spin_frequency as "DAILY",
    rewardCoins: row.reward_coins,
    cooldownSeconds: row.cooldown_seconds,
    maxSpinsPerCustomer: row.max_spins_per_customer,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

interface SpinRow {
  id: number;
  spin_id: string;
  spin_campaign_id: string;
  customer_id: string;
  subscriber_id: string | null;
  spin_status: string;
  reward_coins: number;
  reward_id: string | null;
  idempotency_key: string;
  landed_segment: string;
  last_spin_at: string;
  next_spin_available_at: string;
  created_at: string;
  completed_at: string;
}

function mapSpin(row: SpinRow): SpinTransaction {
  return {
    id: row.id,
    spinId: row.spin_id,
    spinCampaignId: row.spin_campaign_id,
    customerId: row.customer_id,
    subscriberId: row.subscriber_id,
    spinStatus: row.spin_status as SpinTransaction["spinStatus"],
    rewardCoins: row.reward_coins,
    rewardId: row.reward_id,
    idempotencyKey: row.idempotency_key,
    landedSegment: row.landed_segment,
    lastSpinAt: row.last_spin_at,
    nextSpinAvailableAt: row.next_spin_available_at,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export const spinRepository = {
  createCampaign(input: Omit<SpinCampaign, "id">): SpinCampaign {
    getDb()
      .prepare(
        `INSERT INTO spin_campaigns (spin_campaign_id, name, status, spin_frequency, reward_coins, cooldown_seconds, max_spins_per_customer, start_date, end_date)
         VALUES (@spinCampaignId, @name, @status, @spinFrequency, @rewardCoins, @cooldownSeconds, @maxSpinsPerCustomer, @startDate, @endDate)`
      )
      .run(input);
    return this.findActiveCampaign()!;
  },

  findActiveCampaign(): SpinCampaign | null {
    const row = getDb()
      .prepare(`SELECT * FROM spin_campaigns WHERE status = 'ACTIVE' ORDER BY id ASC LIMIT 1`)
      .get() as CampaignRow | undefined;
    return row ? mapCampaign(row) : null;
  },

  findByIdempotencyKey(key: string): SpinTransaction | null {
    const row = getDb()
      .prepare(`SELECT * FROM spin_transactions WHERE idempotency_key = ?`)
      .get(key) as SpinRow | undefined;
    return row ? mapSpin(row) : null;
  },

  lastSpinForCustomer(customerId: string, campaignId: string): SpinTransaction | null {
    const row = getDb()
      .prepare(
        `SELECT * FROM spin_transactions WHERE customer_id = ? AND spin_campaign_id = ? ORDER BY id DESC LIMIT 1`
      )
      .get(customerId, campaignId) as SpinRow | undefined;
    return row ? mapSpin(row) : null;
  },

  create(input: {
    spinId: string;
    spinCampaignId: string;
    customerId: string;
    subscriberId: string | null;
    rewardCoins: number;
    rewardId: string | null;
    idempotencyKey: string;
    landedSegment: string;
    lastSpinAt: string;
    nextSpinAvailableAt: string;
  }): SpinTransaction {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO spin_transactions
          (spin_id, spin_campaign_id, customer_id, subscriber_id, spin_status, reward_coins, reward_id, idempotency_key, landed_segment, last_spin_at, next_spin_available_at, created_at, completed_at)
         VALUES
          (@spinId, @spinCampaignId, @customerId, @subscriberId, 'COMPLETED', @rewardCoins, @rewardId, @idempotencyKey, @landedSegment, @lastSpinAt, @nextSpinAvailableAt, @now, @now)`
      )
      .run({ ...input, now });
    const row = getDb().prepare(`SELECT * FROM spin_transactions WHERE spin_id = ?`).get(input.spinId) as SpinRow;
    return mapSpin(row);
  },

  historyForCustomer(customerId: string, limit = 10): SpinTransaction[] {
    const rows = getDb()
      .prepare(`SELECT * FROM spin_transactions WHERE customer_id = ? ORDER BY id DESC LIMIT ?`)
      .all(customerId, limit) as SpinRow[];
    return rows.map(mapSpin);
  },
};

import { getDb } from "@/lib/db";
import type { Reward, RewardType } from "@/types";

interface RewardRow {
  id: number;
  reward_id: string;
  customer_id: string;
  subscription_id: string | null;
  reward_type: string;
  coins: number;
  status: string;
  description: string;
  created_at: string;
}

function mapRow(row: RewardRow): Reward {
  return {
    id: row.id,
    rewardId: row.reward_id,
    customerId: row.customer_id,
    subscriptionId: row.subscription_id,
    rewardType: row.reward_type as RewardType,
    coins: row.coins,
    status: row.status as Reward["status"],
    description: row.description,
    createdAt: row.created_at,
  };
}

export const rewardRepository = {
  create(input: {
    rewardId: string;
    customerId: string;
    subscriptionId: string | null;
    rewardType: RewardType;
    coins: number;
    description: string;
    status?: Reward["status"];
  }): Reward {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO rewards (reward_id, customer_id, subscription_id, reward_type, coins, status, description, created_at)
         VALUES (@rewardId, @customerId, @subscriptionId, @rewardType, @coins, @status, @description, @now)`
      )
      .run({ ...input, status: input.status ?? "CREDITED", now });
    return this.findByRewardId(input.rewardId)!;
  },

  findByRewardId(rewardId: string): Reward | null {
    const row = getDb()
      .prepare(`SELECT * FROM rewards WHERE reward_id = ?`)
      .get(rewardId) as RewardRow | undefined;
    return row ? mapRow(row) : null;
  },

  hasSignupReward(customerId: string): boolean {
    const row = getDb()
      .prepare(`SELECT 1 FROM rewards WHERE customer_id = ? AND reward_type = 'SIGNUP_REWARD'`)
      .get(customerId);
    return !!row;
  },

  ledgerForCustomer(customerId: string): Reward[] {
    const rows = getDb()
      .prepare(`SELECT * FROM rewards WHERE customer_id = ? ORDER BY id DESC`)
      .all(customerId) as RewardRow[];
    return rows.map(mapRow);
  },

  // Coin balance = derived aggregate of CREDITED reward transactions (Rule 6).
  balanceForCustomer(customerId: string): number {
    const row = getDb()
      .prepare(
        `SELECT COALESCE(SUM(coins), 0) as total FROM rewards WHERE customer_id = ? AND status = 'CREDITED'`
      )
      .get(customerId) as { total: number };
    return row.total;
  },
};

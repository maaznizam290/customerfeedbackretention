import { getDb } from "@/lib/db";
import type { RewardMilestone } from "@/types";

interface Row {
  id: number;
  milestone_id: string;
  name: string;
  required_coins: number;
  reward_type: string;
  reward_title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): RewardMilestone {
  return {
    id: row.id,
    milestoneId: row.milestone_id,
    name: row.name,
    requiredCoins: row.required_coins,
    rewardType: row.reward_type,
    rewardTitle: row.reward_title,
    description: row.description,
    status: row.status as RewardMilestone["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const milestoneRepository = {
  create(input: Omit<RewardMilestone, "id" | "createdAt" | "updatedAt">): RewardMilestone {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO reward_milestones (milestone_id, name, required_coins, reward_type, reward_title, description, status, created_at, updated_at)
         VALUES (@milestoneId, @name, @requiredCoins, @rewardType, @rewardTitle, @description, @status, @now, @now)`
      )
      .run({ ...input, now });
    return this.findById(input.milestoneId)!;
  },

  findById(milestoneId: string): RewardMilestone | null {
    const row = getDb()
      .prepare(`SELECT * FROM reward_milestones WHERE milestone_id = ?`)
      .get(milestoneId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  listActive(): RewardMilestone[] {
    const rows = getDb()
      .prepare(`SELECT * FROM reward_milestones WHERE status = 'ACTIVE' ORDER BY required_coins ASC`)
      .all() as Row[];
    return rows.map(mapRow);
  },
};

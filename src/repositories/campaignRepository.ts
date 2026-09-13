import { getDb } from "@/lib/db";
import type { Campaign, CampaignType } from "@/types";

interface CampaignRow {
  id: number;
  campaign_id: string;
  name: string;
  category: string;
  campaign_type: string;
  description: string;
  eligibility: string;
  reward_coins: number;
  package_id: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CampaignRow): Campaign {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    category: row.category,
    campaignType: row.campaign_type as CampaignType,
    description: row.description,
    eligibility: row.eligibility,
    rewardCoins: row.reward_coins,
    packageId: row.package_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Campaign["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const campaignRepository = {
  create(input: Omit<Campaign, "id" | "createdAt" | "updatedAt">): Campaign {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO campaigns
          (campaign_id, name, category, campaign_type, description, eligibility, reward_coins, package_id, start_date, end_date, status, created_at, updated_at)
         VALUES
          (@campaignId, @name, @category, @campaignType, @description, @eligibility, @rewardCoins, @packageId, @startDate, @endDate, @status, @now, @now)`
      )
      .run({ ...input, now });
    return this.findByCampaignId(input.campaignId)!;
  },

  findByCampaignId(campaignId: string): Campaign | null {
    const row = getDb()
      .prepare(`SELECT * FROM campaigns WHERE campaign_id = ?`)
      .get(campaignId) as CampaignRow | undefined;
    return row ? mapRow(row) : null;
  },

  findActiveByPackageAndType(packageId: string, campaignType: CampaignType): Campaign | null {
    const row = getDb()
      .prepare(
        `SELECT * FROM campaigns WHERE package_id = ? AND campaign_type = ? AND status = 'ACTIVE' LIMIT 1`
      )
      .get(packageId, campaignType) as CampaignRow | undefined;
    return row ? mapRow(row) : null;
  },

  findActiveByType(campaignType: CampaignType): Campaign | null {
    const row = getDb()
      .prepare(`SELECT * FROM campaigns WHERE campaign_type = ? AND status = 'ACTIVE' LIMIT 1`)
      .get(campaignType) as CampaignRow | undefined;
    return row ? mapRow(row) : null;
  },

  listActive(): Campaign[] {
    const rows = getDb()
      .prepare(`SELECT * FROM campaigns WHERE status = 'ACTIVE' ORDER BY id ASC`)
      .all() as CampaignRow[];
    return rows.map(mapRow);
  },

  listAll(): Campaign[] {
    const rows = getDb().prepare(`SELECT * FROM campaigns ORDER BY id ASC`).all() as CampaignRow[];
    return rows.map(mapRow);
  },
};

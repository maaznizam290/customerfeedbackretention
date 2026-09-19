import { getDb } from "@/lib/db";
import type { Campaign, CampaignType, RewardCatalogType, SelectionMethod } from "@/types";

interface CampaignRow {
  id: number;
  campaign_id: string;
  campaign_code: string;
  enterprise_id: string;
  segment: string;
  name: string;
  category: string;
  campaign_type: string;
  behaviour_id: string | null;
  description: string;
  eligibility: string;
  reward_type: string;
  reward_coins: number;
  experience_title: string | null;
  experience_description: string | null;
  token_capacity: number | null;
  max_tokens_per_customer: number | null;
  selection_method: string;
  winner_count: number;
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
    campaignCode: row.campaign_code,
    enterpriseId: row.enterprise_id,
    segment: row.segment,
    name: row.name,
    category: row.category,
    campaignType: row.campaign_type as CampaignType,
    behaviourId: row.behaviour_id,
    description: row.description,
    eligibility: row.eligibility,
    rewardType: row.reward_type as RewardCatalogType,
    rewardCoins: row.reward_coins,
    experienceTitle: row.experience_title,
    experienceDescription: row.experience_description,
    tokenCapacity: row.token_capacity,
    maxTokensPerCustomer: row.max_tokens_per_customer,
    selectionMethod: row.selection_method as SelectionMethod,
    winnerCount: row.winner_count,
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
          (campaign_id, campaign_code, enterprise_id, segment, name, category, campaign_type, behaviour_id,
           description, eligibility, reward_type, reward_coins, experience_title, experience_description,
           token_capacity, max_tokens_per_customer, selection_method, winner_count, package_id, start_date, end_date, status, created_at, updated_at)
         VALUES
          (@campaignId, @campaignCode, @enterpriseId, @segment, @name, @category, @campaignType, @behaviourId,
           @description, @eligibility, @rewardType, @rewardCoins, @experienceTitle, @experienceDescription,
           @tokenCapacity, @maxTokensPerCustomer, @selectionMethod, @winnerCount, @packageId, @startDate, @endDate, @status, @now, @now)`
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

  /**
   * Behaviour-event pipeline lookup: the ACTIVE campaign(s) configured for
   * this behaviour, most specific first (a campaign scoped to a particular
   * package outranks a generic one for the same behaviour) so e.g. the Gold
   * and Platinum subscription campaigns still resolve to their own reward
   * even though they share the same underlying "package purchase" behaviour.
   */
  listActiveByBehaviour(behaviorId: string): Campaign[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM campaigns
         WHERE behaviour_id = ? AND status = 'ACTIVE'
         ORDER BY (package_id IS NULL) ASC, id ASC`
      )
      .all(behaviorId) as CampaignRow[];
    return rows.map(mapRow);
  },

  listActive(): Campaign[] {
    const rows = getDb()
      .prepare(`SELECT * FROM campaigns WHERE status = 'ACTIVE' ORDER BY id ASC`)
      .all() as CampaignRow[];
    return rows.map(mapRow);
  },

  listAll(): Campaign[] {
    const rows = getDb().prepare(`SELECT * FROM campaigns ORDER BY id DESC`).all() as CampaignRow[];
    return rows.map(mapRow);
  },

  setStatus(campaignId: string, status: Campaign["status"]): Campaign | null {
    getDb()
      .prepare(`UPDATE campaigns SET status = ?, updated_at = ? WHERE campaign_id = ?`)
      .run(status, new Date().toISOString(), campaignId);
    return this.findByCampaignId(campaignId);
  },
};

import { getDb } from "@/lib/db";
import type { Package } from "@/types";

interface PackageRow {
  id: number;
  package_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  local_minutes: number;
  data_gb: number;
  sms: number;
  validity_days: number;
  campaign_reward_coins: number;
  badge: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: PackageRow): Package {
  return {
    id: row.id,
    packageId: row.package_id,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: row.currency as "OMR",
    localMinutes: row.local_minutes,
    dataGb: row.data_gb,
    sms: row.sms,
    validityDays: row.validity_days,
    campaignRewardCoins: row.campaign_reward_coins,
    badge: row.badge,
    status: row.status as Package["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const packageRepository = {
  create(input: Omit<Package, "id" | "createdAt" | "updatedAt">): Package {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO packages
          (package_id, name, description, price, currency, local_minutes, data_gb, sms, validity_days, campaign_reward_coins, badge, status, created_at, updated_at)
         VALUES
          (@packageId, @name, @description, @price, @currency, @localMinutes, @dataGb, @sms, @validityDays, @campaignRewardCoins, @badge, @status, @now, @now)`
      )
      .run({ ...input, now });
    return this.findByPackageId(input.packageId)!;
  },

  findByPackageId(packageId: string): Package | null {
    const row = getDb()
      .prepare(`SELECT * FROM packages WHERE package_id = ?`)
      .get(packageId) as PackageRow | undefined;
    return row ? mapRow(row) : null;
  },

  listActive(): Package[] {
    const rows = getDb()
      .prepare(`SELECT * FROM packages WHERE status = 'ACTIVE' ORDER BY price ASC`)
      .all() as PackageRow[];
    return rows.map(mapRow);
  },

  listAll(): Package[] {
    const rows = getDb().prepare(`SELECT * FROM packages ORDER BY price ASC`).all() as PackageRow[];
    return rows.map(mapRow);
  },
};

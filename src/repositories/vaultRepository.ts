import { getDb } from "@/lib/db";
import type { VaultOffer, VaultOfferCategory, VaultRedemption } from "@/types";

interface OfferRow {
  id: number;
  offer_id: string;
  enterprise_id: string;
  partner_name: string;
  category: string;
  city: string;
  icon: string;
  discount_percent: number;
  description: string;
  coin_cost: number;
  demo_partner: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RedemptionRow {
  id: number;
  redemption_id: string;
  offer_id: string;
  customer_id: string;
  reward_id: string;
  coins_spent: number;
  voucher_code: string;
  redeemed_at: string;
}

function mapOffer(row: OfferRow): VaultOffer {
  return {
    id: row.id,
    offerId: row.offer_id,
    enterpriseId: row.enterprise_id,
    partnerName: row.partner_name,
    category: row.category as VaultOfferCategory,
    city: row.city,
    icon: row.icon,
    discountPercent: row.discount_percent,
    description: row.description,
    coinCost: row.coin_cost,
    demoPartner: !!row.demo_partner,
    status: row.status as VaultOffer["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRedemption(row: RedemptionRow): VaultRedemption {
  return {
    id: row.id,
    redemptionId: row.redemption_id,
    offerId: row.offer_id,
    customerId: row.customer_id,
    rewardId: row.reward_id,
    coinsSpent: row.coins_spent,
    voucherCode: row.voucher_code,
    redeemedAt: row.redeemed_at,
  };
}

export const vaultRepository = {
  create(input: {
    offerId: string;
    enterpriseId: string;
    partnerName: string;
    category: VaultOfferCategory;
    city: string;
    icon: string;
    discountPercent: number;
    description: string;
    coinCost: number;
    demoPartner?: boolean;
    status?: VaultOffer["status"];
  }): VaultOffer {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO vault_offers
          (offer_id, enterprise_id, partner_name, category, city, icon, discount_percent, description, coin_cost, demo_partner, status, created_at, updated_at)
         VALUES
          (@offerId, @enterpriseId, @partnerName, @category, @city, @icon, @discountPercent, @description, @coinCost, @demoPartner, @status, @now, @now)`
      )
      .run({
        ...input,
        demoPartner: input.demoPartner ?? true ? 1 : 0,
        status: input.status ?? "ACTIVE",
        now,
      });
    return this.findByOfferId(input.offerId)!;
  },

  findByOfferId(offerId: string): VaultOffer | null {
    const row = getDb().prepare(`SELECT * FROM vault_offers WHERE offer_id = ?`).get(offerId) as OfferRow | undefined;
    return row ? mapOffer(row) : null;
  },

  listActive(): VaultOffer[] {
    const rows = getDb()
      .prepare(`SELECT * FROM vault_offers WHERE status = 'ACTIVE' ORDER BY category ASC, coin_cost ASC`)
      .all() as OfferRow[];
    return rows.map(mapOffer);
  },

  listAll(): VaultOffer[] {
    const rows = getDb().prepare(`SELECT * FROM vault_offers ORDER BY id DESC`).all() as OfferRow[];
    return rows.map(mapOffer);
  },

  createRedemption(input: {
    redemptionId: string;
    offerId: string;
    customerId: string;
    rewardId: string;
    coinsSpent: number;
    voucherCode: string;
  }): VaultRedemption | null {
    const now = new Date().toISOString();
    try {
      getDb()
        .prepare(
          `INSERT INTO vault_redemptions (redemption_id, offer_id, customer_id, reward_id, coins_spent, voucher_code, redeemed_at)
           VALUES (@redemptionId, @offerId, @customerId, @rewardId, @coinsSpent, @voucherCode, @now)`
        )
        .run({ ...input, now });
    } catch {
      // UNIQUE(offer_id, customer_id) violation: already redeemed.
      return null;
    }
    return this.findRedemption(input.offerId, input.customerId);
  },

  findRedemption(offerId: string, customerId: string): VaultRedemption | null {
    const row = getDb()
      .prepare(`SELECT * FROM vault_redemptions WHERE offer_id = ? AND customer_id = ?`)
      .get(offerId, customerId) as RedemptionRow | undefined;
    return row ? mapRedemption(row) : null;
  },

  redemptionsForCustomer(customerId: string): VaultRedemption[] {
    const rows = getDb()
      .prepare(`SELECT * FROM vault_redemptions WHERE customer_id = ? ORDER BY id DESC`)
      .all(customerId) as RedemptionRow[];
    return rows.map(mapRedemption);
  },
};

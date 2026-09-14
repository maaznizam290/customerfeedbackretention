import { getDb } from "@/lib/db";
import type { Customer } from "@/types";

interface CustomerRow {
  id: number;
  customer_id: string;
  full_name: string;
  email: string;
  password_hash: string;
  referral_code: string;
  referred_by_code: string | null;
  is_simulated: number;
  simulation_id: string | null;
  customer_type: string;
  current_package_id: string | null;
  last_recharge_amount: number | null;
  last_recharge_date: string | null;
  package_expiry_date: string | null;
  monthly_recharge_count: number;
  monthly_spend: number;
  engagement_status: string;
  churn_segment: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    customerId: row.customer_id,
    fullName: row.full_name,
    email: row.email,
    passwordHash: row.password_hash,
    referralCode: row.referral_code,
    referredByCode: row.referred_by_code,
    isSimulated: !!row.is_simulated,
    simulationId: row.simulation_id,
    customerType: row.customer_type,
    currentPackageId: row.current_package_id,
    lastRechargeAmount: row.last_recharge_amount,
    lastRechargeDate: row.last_recharge_date,
    packageExpiryDate: row.package_expiry_date,
    monthlyRechargeCount: row.monthly_recharge_count,
    monthlySpend: row.monthly_spend,
    engagementStatus: row.engagement_status,
    churnSegment: row.churn_segment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const customerRepository = {
  create(input: {
    customerId: string;
    fullName: string;
    email: string;
    passwordHash: string;
    referralCode: string;
    referredByCode: string | null;
  }): Customer {
    const now = new Date().toISOString();
    const db = getDb();
    db.prepare(
      `INSERT INTO customers (customer_id, full_name, email, password_hash, referral_code, referred_by_code, created_at, updated_at)
       VALUES (@customerId, @fullName, @email, @passwordHash, @referralCode, @referredByCode, @now, @now)`
    ).run({ ...input, now });
    return this.findByCustomerId(input.customerId)!;
  },

  /** Used only by the admin customer simulator — see docs on `is_simulated`. */
  createSimulated(input: {
    customerId: string;
    fullName: string;
    email: string;
    passwordHash: string;
    referralCode: string;
    simulationId: string;
    customerType: string;
    currentPackageId: string | null;
    lastRechargeAmount: number | null;
    lastRechargeDate: string | null;
    packageExpiryDate: string | null;
    monthlyRechargeCount: number;
    monthlySpend: number;
    engagementStatus: string;
    churnSegment: string | null;
  }): Customer {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO customers
          (customer_id, full_name, email, password_hash, referral_code, referred_by_code,
           is_simulated, simulation_id, customer_type, current_package_id, last_recharge_amount,
           last_recharge_date, package_expiry_date, monthly_recharge_count, monthly_spend,
           engagement_status, churn_segment, created_at, updated_at)
         VALUES
          (@customerId, @fullName, @email, @passwordHash, @referralCode, NULL,
           1, @simulationId, @customerType, @currentPackageId, @lastRechargeAmount,
           @lastRechargeDate, @packageExpiryDate, @monthlyRechargeCount, @monthlySpend,
           @engagementStatus, @churnSegment, @now, @now)`
      )
      .run({ ...input, now });
    return this.findByCustomerId(input.customerId)!;
  },

  findByCustomerId(customerId: string): Customer | null {
    const row = getDb()
      .prepare(`SELECT * FROM customers WHERE customer_id = ?`)
      .get(customerId) as CustomerRow | undefined;
    return row ? mapRow(row) : null;
  },

  findByEmail(email: string): Customer | null {
    const row = getDb()
      .prepare(`SELECT * FROM customers WHERE email = ?`)
      .get(email.toLowerCase()) as CustomerRow | undefined;
    return row ? mapRow(row) : null;
  },

  findByReferralCode(code: string): Customer | null {
    const row = getDb()
      .prepare(`SELECT * FROM customers WHERE referral_code = ?`)
      .get(code) as CustomerRow | undefined;
    return row ? mapRow(row) : null;
  },

  list(): Customer[] {
    const rows = getDb().prepare(`SELECT * FROM customers ORDER BY id ASC`).all() as CustomerRow[];
    return rows.map(mapRow);
  },

  listPage(options: { limit: number; offset: number; simulatedOnly?: boolean }): Customer[] {
    const where = options.simulatedOnly ? "WHERE is_simulated = 1" : "";
    const rows = getDb()
      .prepare(`SELECT * FROM customers ${where} ORDER BY id DESC LIMIT ? OFFSET ?`)
      .all(options.limit, options.offset) as CustomerRow[];
    return rows.map(mapRow);
  },

  count(simulatedOnly?: boolean): number {
    const where = simulatedOnly ? "WHERE is_simulated = 1" : "";
    const row = getDb().prepare(`SELECT COUNT(*) as c FROM customers ${where}`).get() as { c: number };
    return row.c;
  },
};

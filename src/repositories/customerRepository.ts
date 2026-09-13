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
};

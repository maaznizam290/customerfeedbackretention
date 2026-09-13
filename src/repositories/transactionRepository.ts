import { getDb } from "@/lib/db";
import type { AtharxTransaction, TransactionType } from "@/types";

interface TransactionRow {
  id: number;
  transaction_id: string;
  customer_id: string;
  subscription_id: string | null;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  reference: string;
  created_at: string;
}

function mapRow(row: TransactionRow): AtharxTransaction {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    customerId: row.customer_id,
    subscriptionId: row.subscription_id,
    transactionType: row.transaction_type as TransactionType,
    amount: row.amount,
    currency: row.currency,
    status: row.status as AtharxTransaction["status"],
    reference: row.reference,
    createdAt: row.created_at,
  };
}

export const transactionRepository = {
  create(input: {
    transactionId: string;
    customerId: string;
    subscriptionId: string | null;
    transactionType: TransactionType;
    amount: number;
    currency: string;
    status: AtharxTransaction["status"];
    reference: string;
  }): AtharxTransaction {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO transactions (transaction_id, customer_id, subscription_id, transaction_type, amount, currency, status, reference, created_at)
         VALUES (@transactionId, @customerId, @subscriptionId, @transactionType, @amount, @currency, @status, @reference, @now)`
      )
      .run({ ...input, now });
    return mapRow(
      getDb().prepare(`SELECT * FROM transactions WHERE transaction_id = ?`).get(input.transactionId) as TransactionRow
    );
  },

  listByCustomer(customerId: string): AtharxTransaction[] {
    const rows = getDb()
      .prepare(`SELECT * FROM transactions WHERE customer_id = ? ORDER BY id DESC`)
      .all(customerId) as TransactionRow[];
    return rows.map(mapRow);
  },
};

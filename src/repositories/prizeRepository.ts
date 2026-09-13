import { getDb } from "@/lib/db";
import type { Prize } from "@/types";

interface Row {
  id: number;
  prize_id: string;
  name: string;
  description: string;
  category: string;
  rank: number | null;
  quantity: number;
  estimated_value: number | null;
  currency: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): Prize {
  return {
    id: row.id,
    prizeId: row.prize_id,
    name: row.name,
    description: row.description,
    category: row.category,
    rank: row.rank,
    quantity: row.quantity,
    estimatedValue: row.estimated_value,
    currency: row.currency,
    imageUrl: row.image_url,
    status: row.status as Prize["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const prizeRepository = {
  create(input: Omit<Prize, "id" | "createdAt" | "updatedAt">): Prize {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO prizes (prize_id, name, description, category, rank, quantity, estimated_value, currency, image_url, status, created_at, updated_at)
         VALUES (@prizeId, @name, @description, @category, @rank, @quantity, @estimatedValue, @currency, @imageUrl, @status, @now, @now)`
      )
      .run({ ...input, now });
    return this.findById(input.prizeId)!;
  },

  findById(prizeId: string): Prize | null {
    const row = getDb().prepare(`SELECT * FROM prizes WHERE prize_id = ?`).get(prizeId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  listActive(): Prize[] {
    const rows = getDb()
      .prepare(`SELECT * FROM prizes WHERE status = 'ACTIVE' ORDER BY rank ASC`)
      .all() as Row[];
    return rows.map(mapRow);
  },
};

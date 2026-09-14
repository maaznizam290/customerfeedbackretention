import { getDb } from "@/lib/db";
import type { Enterprise } from "@/types";

interface Row {
  id: number;
  enterprise_id: string;
  name: string;
  industry: string;
  country: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): Enterprise {
  return {
    id: row.id,
    enterpriseId: row.enterprise_id,
    name: row.name,
    industry: row.industry,
    country: row.country,
    status: row.status as Enterprise["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const enterpriseRepository = {
  create(input: { enterpriseId: string; name: string; industry: string; country: string }): Enterprise {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO enterprises (enterprise_id, name, industry, country, status, created_at, updated_at)
         VALUES (@enterpriseId, @name, @industry, @country, 'ACTIVE', @now, @now)`
      )
      .run({ ...input, now });
    return this.findById(input.enterpriseId)!;
  },

  findById(enterpriseId: string): Enterprise | null {
    const row = getDb()
      .prepare(`SELECT * FROM enterprises WHERE enterprise_id = ?`)
      .get(enterpriseId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  listAll(): Enterprise[] {
    const rows = getDb().prepare(`SELECT * FROM enterprises ORDER BY id ASC`).all() as Row[];
    return rows.map(mapRow);
  },
};

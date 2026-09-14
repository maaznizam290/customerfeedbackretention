import { getDb } from "@/lib/db";
import type { Behaviour, BehaviourRule } from "@/types";

interface Row {
  id: number;
  behavior_id: string;
  name: string;
  event_type: string;
  rule: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: Row): Behaviour {
  return {
    id: row.id,
    behaviorId: row.behavior_id,
    name: row.name,
    eventType: row.event_type,
    rule: JSON.parse(row.rule) as BehaviourRule,
    description: row.description,
    status: row.status as Behaviour["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const behaviourRepository = {
  create(input: {
    behaviorId: string;
    name: string;
    eventType: string;
    rule: BehaviourRule;
    description: string;
  }): Behaviour {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO behaviours (behavior_id, name, event_type, rule, description, status, created_at, updated_at)
         VALUES (@behaviorId, @name, @eventType, @rule, @description, 'ACTIVE', @now, @now)`
      )
      .run({ ...input, rule: JSON.stringify(input.rule ?? {}), now });
    return this.findById(input.behaviorId)!;
  },

  findById(behaviorId: string): Behaviour | null {
    const row = getDb()
      .prepare(`SELECT * FROM behaviours WHERE behavior_id = ?`)
      .get(behaviorId) as Row | undefined;
    return row ? mapRow(row) : null;
  },

  listActiveByEventType(eventType: string): Behaviour[] {
    const rows = getDb()
      .prepare(`SELECT * FROM behaviours WHERE event_type = ? AND status = 'ACTIVE' ORDER BY id ASC`)
      .all(eventType) as Row[];
    return rows.map(mapRow);
  },

  listAll(): Behaviour[] {
    const rows = getDb().prepare(`SELECT * FROM behaviours ORDER BY id DESC`).all() as Row[];
    return rows.map(mapRow);
  },

  setStatus(behaviorId: string, status: Behaviour["status"]): Behaviour | null {
    getDb()
      .prepare(`UPDATE behaviours SET status = ?, updated_at = ? WHERE behavior_id = ?`)
      .run(status, new Date().toISOString(), behaviorId);
    return this.findById(behaviorId);
  },
};

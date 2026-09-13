import { getDb } from "@/lib/db";
import type { LuckyDraw, LuckyDrawEntry, LuckyDrawRun, LuckyDrawWinner } from "@/types";

interface DrawRow {
  id: number;
  lucky_draw_id: string;
  campaign_id: string | null;
  name: string;
  minimum_coins: number;
  entry_requirement: string;
  start_date: string;
  end_date: string | null;
  draw_date: string | null;
  winner_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

function mapDraw(row: DrawRow): LuckyDraw {
  return {
    id: row.id,
    luckyDrawId: row.lucky_draw_id,
    campaignId: row.campaign_id,
    name: row.name,
    minimumCoins: row.minimum_coins,
    entryRequirement: row.entry_requirement,
    startDate: row.start_date,
    endDate: row.end_date,
    drawDate: row.draw_date,
    winnerCount: row.winner_count,
    status: row.status as LuckyDraw["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface EntryRow {
  id: number;
  entry_id: string;
  lucky_draw_id: string;
  customer_id: string;
  subscriber_id: string | null;
  entry_number: number;
  eligibility_status: string;
  source: string;
  created_at: string;
}

function mapEntry(row: EntryRow): LuckyDrawEntry {
  return {
    id: row.id,
    entryId: row.entry_id,
    luckyDrawId: row.lucky_draw_id,
    customerId: row.customer_id,
    subscriberId: row.subscriber_id,
    entryNumber: row.entry_number,
    eligibilityStatus: row.eligibility_status as LuckyDrawEntry["eligibilityStatus"],
    source: row.source,
    createdAt: row.created_at,
  };
}

interface RunRow {
  id: number;
  draw_run_id: string;
  lucky_draw_id: string;
  executed_at: string;
  executed_by: string;
  algorithm_version: string;
  total_entries: number;
  winner_count: number;
  status: string;
  audit_reference: string;
}

function mapRun(row: RunRow): LuckyDrawRun {
  return {
    id: row.id,
    drawRunId: row.draw_run_id,
    luckyDrawId: row.lucky_draw_id,
    executedAt: row.executed_at,
    executedBy: row.executed_by,
    algorithmVersion: row.algorithm_version,
    totalEntries: row.total_entries,
    winnerCount: row.winner_count,
    status: row.status as LuckyDrawRun["status"],
    auditReference: row.audit_reference,
  };
}

interface WinnerRow {
  id: number;
  winner_id: string;
  draw_run_id: string;
  customer_id: string;
  customer_name: string;
  subscriber_id: string | null;
  prize_id: string;
  rank: number;
  status: string;
  selected_at: string;
}

function mapWinner(row: WinnerRow): LuckyDrawWinner {
  return {
    id: row.id,
    winnerId: row.winner_id,
    drawRunId: row.draw_run_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    subscriberId: row.subscriber_id,
    prizeId: row.prize_id,
    rank: row.rank,
    status: row.status as LuckyDrawWinner["status"],
    selectedAt: row.selected_at,
  };
}

export const luckyDrawRepository = {
  createDraw(input: Omit<LuckyDraw, "id" | "createdAt" | "updatedAt">): LuckyDraw {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO lucky_draws (lucky_draw_id, campaign_id, name, minimum_coins, entry_requirement, start_date, end_date, draw_date, winner_count, status, created_at, updated_at)
         VALUES (@luckyDrawId, @campaignId, @name, @minimumCoins, @entryRequirement, @startDate, @endDate, @drawDate, @winnerCount, @status, @now, @now)`
      )
      .run({ ...input, now });
    return this.findDrawById(input.luckyDrawId)!;
  },

  findDrawById(luckyDrawId: string): LuckyDraw | null {
    const row = getDb()
      .prepare(`SELECT * FROM lucky_draws WHERE lucky_draw_id = ?`)
      .get(luckyDrawId) as DrawRow | undefined;
    return row ? mapDraw(row) : null;
  },

  listActiveDraws(): LuckyDraw[] {
    const rows = getDb()
      .prepare(`SELECT * FROM lucky_draws WHERE status = 'ACTIVE' ORDER BY id ASC`)
      .all() as DrawRow[];
    return rows.map(mapDraw);
  },

  createEntry(input: {
    entryId: string;
    luckyDrawId: string;
    customerId: string;
    subscriberId: string | null;
    entryNumber: number;
    source: string;
  }): LuckyDrawEntry | null {
    const now = new Date().toISOString();
    const db = getDb();
    try {
      db.prepare(
        `INSERT INTO lucky_draw_entries (entry_id, lucky_draw_id, customer_id, subscriber_id, entry_number, eligibility_status, source, created_at)
         VALUES (@entryId, @luckyDrawId, @customerId, @subscriberId, @entryNumber, 'ELIGIBLE', @source, @now)`
      ).run({ ...input, now });
    } catch {
      // Unique (lucky_draw_id, customer_id, source) violated -> entry already exists for this source.
      return null;
    }
    const row = db
      .prepare(`SELECT * FROM lucky_draw_entries WHERE entry_id = ?`)
      .get(input.entryId) as EntryRow;
    return mapEntry(row);
  },

  entriesForCustomer(luckyDrawId: string, customerId: string): LuckyDrawEntry[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM lucky_draw_entries WHERE lucky_draw_id = ? AND customer_id = ? ORDER BY entry_number ASC`
      )
      .all(luckyDrawId, customerId) as EntryRow[];
    return rows.map(mapEntry);
  },

  allEntries(luckyDrawId: string): LuckyDrawEntry[] {
    const rows = getDb()
      .prepare(`SELECT * FROM lucky_draw_entries WHERE lucky_draw_id = ? ORDER BY entry_number ASC`)
      .all(luckyDrawId) as EntryRow[];
    return rows.map(mapEntry);
  },

  nextEntryNumber(luckyDrawId: string): number {
    const row = getDb()
      .prepare(`SELECT COALESCE(MAX(entry_number), 0) as maxNum FROM lucky_draw_entries WHERE lucky_draw_id = ?`)
      .get(luckyDrawId) as { maxNum: number };
    return row.maxNum + 1;
  },

  createRun(input: Omit<LuckyDrawRun, "id">): LuckyDrawRun {
    getDb()
      .prepare(
        `INSERT INTO lucky_draw_runs (draw_run_id, lucky_draw_id, executed_at, executed_by, algorithm_version, total_entries, winner_count, status, audit_reference)
         VALUES (@drawRunId, @luckyDrawId, @executedAt, @executedBy, @algorithmVersion, @totalEntries, @winnerCount, @status, @auditReference)`
      )
      .run(input);
    const row = getDb()
      .prepare(`SELECT * FROM lucky_draw_runs WHERE draw_run_id = ?`)
      .get(input.drawRunId) as RunRow;
    return mapRun(row);
  },

  createWinner(input: Omit<LuckyDrawWinner, "id">): LuckyDrawWinner {
    getDb()
      .prepare(
        `INSERT INTO lucky_draw_winners (winner_id, draw_run_id, customer_id, customer_name, subscriber_id, prize_id, rank, status, selected_at)
         VALUES (@winnerId, @drawRunId, @customerId, @customerName, @subscriberId, @prizeId, @rank, @status, @selectedAt)`
      )
      .run(input);
    const row = getDb()
      .prepare(`SELECT * FROM lucky_draw_winners WHERE winner_id = ?`)
      .get(input.winnerId) as WinnerRow;
    return mapWinner(row);
  },

  winnersForDraw(luckyDrawId: string): LuckyDrawWinner[] {
    const rows = getDb()
      .prepare(
        `SELECT w.* FROM lucky_draw_winners w
         JOIN lucky_draw_runs r ON r.draw_run_id = w.draw_run_id
         WHERE r.lucky_draw_id = ?
         ORDER BY w.rank ASC`
      )
      .all(luckyDrawId) as WinnerRow[];
    return rows.map(mapWinner);
  },
};

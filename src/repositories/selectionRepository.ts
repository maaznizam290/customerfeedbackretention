import { getDb } from "@/lib/db";
import type { SelectionResult, SelectionRun } from "@/types";

interface RunRow {
  id: number;
  run_id: string;
  campaign_id: string;
  eligible_count: number;
  selected_count: number;
  executed_at: string;
  executed_by: string;
  algorithm_version: string;
  status: string;
  audit_reference: string;
}

function mapRun(row: RunRow): SelectionRun {
  return {
    id: row.id,
    runId: row.run_id,
    campaignId: row.campaign_id,
    eligibleCount: row.eligible_count,
    selectedCount: row.selected_count,
    executedAt: row.executed_at,
    executedBy: row.executed_by,
    algorithmVersion: row.algorithm_version,
    status: row.status as SelectionRun["status"],
    auditReference: row.audit_reference,
  };
}

interface ResultRow {
  id: number;
  result_id: string;
  run_id: string;
  token_id: string;
  customer_id: string;
  subscriber_id: string | null;
  rank: number;
  status: string;
  selected_at: string;
}

function mapResult(row: ResultRow): SelectionResult {
  return {
    id: row.id,
    resultId: row.result_id,
    runId: row.run_id,
    tokenId: row.token_id,
    customerId: row.customer_id,
    subscriberId: row.subscriber_id,
    rank: row.rank,
    status: row.status as "SELECTED",
    selectedAt: row.selected_at,
  };
}

export const selectionRepository = {
  createRun(input: Omit<SelectionRun, "id">): SelectionRun {
    getDb()
      .prepare(
        `INSERT INTO selection_runs (run_id, campaign_id, eligible_count, selected_count, executed_at, executed_by, algorithm_version, status, audit_reference)
         VALUES (@runId, @campaignId, @eligibleCount, @selectedCount, @executedAt, @executedBy, @algorithmVersion, @status, @auditReference)`
      )
      .run(input);
    const row = getDb().prepare(`SELECT * FROM selection_runs WHERE run_id = ?`).get(input.runId) as RunRow;
    return mapRun(row);
  },

  createResult(input: Omit<SelectionResult, "id">): SelectionResult {
    getDb()
      .prepare(
        `INSERT INTO selection_results (result_id, run_id, token_id, customer_id, subscriber_id, rank, status, selected_at)
         VALUES (@resultId, @runId, @tokenId, @customerId, @subscriberId, @rank, @status, @selectedAt)`
      )
      .run(input);
    const row = getDb()
      .prepare(`SELECT * FROM selection_results WHERE result_id = ?`)
      .get(input.resultId) as ResultRow;
    return mapResult(row);
  },

  findRunByCampaign(campaignId: string): SelectionRun | null {
    const row = getDb()
      .prepare(`SELECT * FROM selection_runs WHERE campaign_id = ? ORDER BY id DESC LIMIT 1`)
      .get(campaignId) as RunRow | undefined;
    return row ? mapRun(row) : null;
  },

  resultsForRun(runId: string): SelectionResult[] {
    const rows = getDb()
      .prepare(`SELECT * FROM selection_results WHERE run_id = ? ORDER BY rank ASC`)
      .all(runId) as ResultRow[];
    return rows.map(mapResult);
  },

  listRuns(limit = 50): SelectionRun[] {
    const rows = getDb().prepare(`SELECT * FROM selection_runs ORDER BY id DESC LIMIT ?`).all(limit) as RunRow[];
    return rows.map(mapRun);
  },
};

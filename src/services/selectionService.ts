import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { generateSelectionResultId, generateSelectionRunId } from "@/lib/ids";
import { campaignService } from "@/services/campaignService";
import { tokenRepository } from "@/repositories/tokenRepository";
import { selectionRepository } from "@/repositories/selectionRepository";
import { AppError } from "@/lib/errors";
import type { SelectionResult, SelectionRun } from "@/types";

const ALGORITHM_VERSION = "v1-crypto-random";

export class CampaignNotClosableError extends AppError {
  constructor(reason: string) {
    super(`This campaign cannot be run through selection yet: ${reason}`, 409, "CAMPAIGN_NOT_CLOSABLE");
  }
}

/**
 * The generalized Selection Engine (§24/§25 of the brief): closes a
 * campaign's token pool and — for RANDOM_DRAW campaigns — picks winners
 * server-side only, using a CSPRNG, with a full audit trail
 * (selection_runs/selection_results). This is the same shape as the
 * existing Lucky Draw's own draw mechanic (kept separately for backward
 * compatibility) generalized to any campaign, e.g. a limited-inventory
 * experience like "ATHARX F1 Experience".
 */
export const selectionService = {
  /**
   * Executes selection for a CLOSED campaign. ALL_ELIGIBLE campaigns (e.g.
   * ordinary package-subscription rewards) have no draw step — every
   * issued token IS the result — so this only performs a real random draw
   * for selectionMethod === 'RANDOM_DRAW'.
   */
  executeSelection(campaignId: string, executedBy = "ADMIN"): { run: SelectionRun; results: SelectionResult[] } {
    const campaign = campaignService.getByCampaignId(campaignId);
    if (!campaign) throw new AppError("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    if (campaign.status !== "CLOSED") {
      throw new CampaignNotClosableError(`status is ${campaign.status}, expected CLOSED`);
    }

    const db = getDb();
    const run = db.transaction((): { run: SelectionRun; results: SelectionResult[] } => {
      const eligibleTokens = tokenRepository.listEligibleForCampaign(campaignId);

      const pool = [...eligibleTokens];
      const winnerCount =
        campaign.selectionMethod === "RANDOM_DRAW" ? Math.min(campaign.winnerCount, pool.length) : pool.length;

      const selectionRun = selectionRepository.createRun({
        runId: generateSelectionRunId(),
        campaignId,
        eligibleCount: eligibleTokens.length,
        selectedCount: winnerCount,
        executedAt: new Date().toISOString(),
        executedBy,
        algorithmVersion: ALGORITHM_VERSION,
        status: "COMPLETED",
        auditReference: crypto.randomUUID(),
      });

      const results: SelectionResult[] = [];
      for (let rank = 1; rank <= winnerCount; rank++) {
        const chosen =
          campaign.selectionMethod === "RANDOM_DRAW"
            ? pool.splice(crypto.randomInt(0, pool.length), 1)[0]
            : pool[rank - 1];

        tokenRepository.setStatus(chosen.tokenId, "SELECTED");
        const result = selectionRepository.createResult({
          resultId: generateSelectionResultId(),
          runId: selectionRun.runId,
          tokenId: chosen.tokenId,
          customerId: chosen.customerId,
          subscriberId: chosen.subscriberId,
          rank,
          status: "SELECTED",
          selectedAt: new Date().toISOString(),
        });
        results.push(result);
      }

      campaignService.setStatus(campaignId, "COMPLETED");

      return { run: selectionRun, results };
    });

    return run();
  },

  getRunForCampaign(campaignId: string): SelectionRun | null {
    return selectionRepository.findRunByCampaign(campaignId);
  },

  getResultsForRun(runId: string): SelectionResult[] {
    return selectionRepository.resultsForRun(runId);
  },

  listRuns(): SelectionRun[] {
    return selectionRepository.listRuns();
  },
};

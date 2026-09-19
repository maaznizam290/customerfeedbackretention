import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { generateSelectionResultId, generateSelectionRunId } from "@/lib/ids";
import { campaignService } from "@/services/campaignService";
import { auditService } from "@/services/auditService";
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

function hashPool(tokenIds: string[]): string {
  const sorted = [...tokenIds].sort();
  return crypto.createHash("sha256").update(sorted.join(",")).digest("hex");
}

/**
 * The generalized Selection Engine (spec §24/§25/§42): closes a campaign's
 * token pool, LOCKS it (a tamper-evident snapshot + SHA-256 integrity hash,
 * spec's "Locked Eligible Token List"), then draws winners server-side only
 * using a CSPRNG, revalidating each tentative winner's token against its
 * live status before finalizing — a token that changed status between lock
 * and draw (e.g. an admin placed it on HOLD/CANCELLED for exception review)
 * is skipped in favour of an alternate, both outcomes fully audited. This
 * is an MVP integrity aid, not a regulatory-certified randomisation service
 * (never claim otherwise in the UI).
 */
export const selectionService = {
  /**
   * Locks the eligible pool for a CLOSED campaign: snapshots every ISSUED
   * token at this instant, computes its integrity hash, and persists both.
   * Safe to call at most once per campaign — `executeSelection` calls this
   * automatically if a caller skips straight to execution, so the two-step
   * Close -> Lock -> Select flow and the single-call flow both work.
   */
  lockEligiblePool(campaignId: string, actor = "ADMIN"): SelectionRun {
    const campaign = campaignService.getByCampaignId(campaignId);
    if (!campaign) throw new AppError("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");
    if (campaign.status !== "CLOSED") {
      throw new CampaignNotClosableError(`status is ${campaign.status}, expected CLOSED`);
    }
    const existing = selectionRepository.findRunByCampaign(campaignId);
    if (existing) {
      throw new AppError("This campaign's eligible pool is already locked.", 409, "POOL_ALREADY_LOCKED");
    }

    const db = getDb();
    const run = db.transaction((): SelectionRun => {
      const eligibleTokens = tokenRepository.listEligibleForCampaign(campaignId);
      const lockedAt = new Date().toISOString();
      const poolHash = hashPool(eligibleTokens.map((t) => t.tokenId));

      const selectionRun = selectionRepository.createRun({
        runId: generateSelectionRunId(),
        campaignId,
        eligibleCount: eligibleTokens.length,
        selectedCount: 0,
        eligiblePoolHash: poolHash,
        lockedAt,
        executedAt: lockedAt,
        executedBy: actor,
        algorithmVersion: ALGORITHM_VERSION,
        status: "LOCKED",
        auditReference: crypto.randomUUID(),
      });

      selectionRepository.savePoolSnapshot(
        selectionRun.runId,
        eligibleTokens.map((t) => ({ tokenId: t.tokenId, customerId: t.customerId, subscriberId: t.subscriberId }))
      );

      auditService.record({
        eventType: "ELIGIBLE_POOL_LOCKED",
        enterpriseId: campaign.enterpriseId,
        campaignId,
        actor,
        afterValue: { eligibleCount: eligibleTokens.length, eligiblePoolHash: poolHash, lockedAt },
      });

      return selectionRun;
    });

    return run();
  },

  /**
   * Executes selection against the locked pool. ALL_ELIGIBLE campaigns
   * (e.g. ordinary package-subscription rewards) have no draw step — every
   * locked token IS the result — so a real random draw only happens for
   * selectionMethod === 'RANDOM_DRAW'.
   */
  executeSelection(campaignId: string, executedBy = "ADMIN"): { run: SelectionRun; results: SelectionResult[] } {
    const campaign = campaignService.getByCampaignId(campaignId);
    if (!campaign) throw new AppError("Campaign not found.", 404, "CAMPAIGN_NOT_FOUND");

    let lockedRun = selectionRepository.findRunByCampaign(campaignId);
    if (!lockedRun) {
      lockedRun = this.lockEligiblePool(campaignId, executedBy);
    }
    if (lockedRun.status === "COMPLETED") {
      throw new AppError("Selection has already been executed for this campaign.", 409, "SELECTION_ALREADY_EXECUTED");
    }

    const db = getDb();
    const run = db.transaction((): { run: SelectionRun; results: SelectionResult[] } => {
      auditService.record({
        eventType: "SELECTION_STARTED",
        enterpriseId: campaign.enterpriseId,
        campaignId,
        actor: executedBy,
        afterValue: { runId: lockedRun!.runId, eligibleCount: lockedRun!.eligibleCount },
      });

      // Draw only from the frozen lock-time snapshot — never a fresh query
      // — so nothing issued after lock can enter the draw.
      const pool = selectionRepository.getPoolSnapshot(lockedRun!.runId);
      const targetWinnerCount =
        campaign.selectionMethod === "RANDOM_DRAW" ? Math.min(campaign.winnerCount, pool.length) : pool.length;

      const results: SelectionResult[] = [];
      let rank = 1;

      while (results.length < targetWinnerCount && pool.length > 0) {
        const index = campaign.selectionMethod === "RANDOM_DRAW" ? crypto.randomInt(0, pool.length) : 0;
        const candidate = pool.splice(index, 1)[0];

        // Winner revalidation (spec §25): re-check the token's LIVE status
        // right before finalizing — it may have been placed on HOLD or
        // CANCELLED for exception review since the pool was locked.
        const liveToken = tokenRepository.findById(candidate.tokenId);
        if (!liveToken || liveToken.status !== "ISSUED") {
          auditService.record({
            eventType: "WINNER_REVALIDATION_FAILED",
            enterpriseId: campaign.enterpriseId,
            campaignId,
            customerId: candidate.customerId,
            tokenId: candidate.tokenId,
            actor: executedBy,
            afterValue: { reason: `Token status is ${liveToken?.status ?? "MISSING"}, expected ISSUED` },
          });
          if (pool.length > 0) {
            auditService.record({
              eventType: "ALTERNATE_SELECTED",
              enterpriseId: campaign.enterpriseId,
              campaignId,
              actor: executedBy,
              beforeValue: { rejectedTokenId: candidate.tokenId },
              afterValue: { rank },
            });
          }
          continue;
        }

        tokenRepository.setStatus(candidate.tokenId, "SELECTED");
        const result = selectionRepository.createResult({
          resultId: generateSelectionResultId(),
          runId: lockedRun!.runId,
          tokenId: candidate.tokenId,
          customerId: candidate.customerId,
          subscriberId: candidate.subscriberId,
          rank,
          status: "SELECTED",
          selectedAt: new Date().toISOString(),
        });
        results.push(result);
        auditService.record({
          eventType: "WINNER_SELECTED",
          enterpriseId: campaign.enterpriseId,
          campaignId,
          customerId: candidate.customerId,
          tokenId: candidate.tokenId,
          actor: executedBy,
          afterValue: { rank },
        });
        rank++;
      }

      const finalRun = selectionRepository.markExecuted(lockedRun!.runId, {
        executedAt: new Date().toISOString(),
        selectedCount: results.length,
        status: "COMPLETED",
      });

      campaignService.setStatus(campaignId, "COMPLETED");

      return { run: finalRun, results };
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

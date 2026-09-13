import crypto from "node:crypto";
import { luckyDrawRepository } from "@/repositories/luckyDrawRepository";
import { customerRepository } from "@/repositories/customerRepository";
import { subscriberRepository } from "@/repositories/subscriberRepository";
import { prizeRepository } from "@/repositories/prizeRepository";
import { rewardService } from "@/services/rewardService";
import { getDb } from "@/lib/db";
import { generateDrawRunId, generateEntryId, generateWinnerId } from "@/lib/ids";
import type { LuckyDraw, LuckyDrawEntry, LuckyDrawWinner } from "@/types";

export interface LuckyDrawEligibility {
  eligible: boolean;
  luckyDrawId: string;
  minimumCoins: number;
  balance: number;
  coinsRemaining: number;
  entries: number;
}

const ALGORITHM_VERSION = "v1-crypto-random";

/**
 * Entry-granting rules are configurable (per lucky draw + "source" of entry,
 * e.g. SIGNUP, PACKAGE_SUBSCRIPTION, REFERRAL_SUCCESS). Winner selection is
 * always performed server-side (executeDraw) — the frontend never computes
 * or is trusted with picking winners.
 */
export const luckyDrawService = {
  listActive(): LuckyDraw[] {
    return luckyDrawRepository.listActiveDraws();
  },

  checkEligibility(luckyDrawId: string, customerId: string): LuckyDrawEligibility | null {
    const draw = luckyDrawRepository.findDrawById(luckyDrawId);
    if (!draw) return null;
    const balance = rewardService.getBalance(customerId);
    const entries = luckyDrawRepository.entriesForCustomer(luckyDrawId, customerId);
    return {
      eligible: balance >= draw.minimumCoins,
      luckyDrawId,
      minimumCoins: draw.minimumCoins,
      balance,
      coinsRemaining: Math.max(draw.minimumCoins - balance, 0),
      entries: entries.length,
    };
  },

  getEntries(luckyDrawId: string, customerId: string): LuckyDrawEntry[] {
    return luckyDrawRepository.entriesForCustomer(luckyDrawId, customerId);
  },

  /**
   * Grants one lucky-draw entry for a qualifying business event, if the
   * customer is eligible and hasn't already received an entry from that
   * same source (enforced by a unique DB constraint, so this is safe under
   * concurrent calls).
   */
  grantEntryIfEligible(customerId: string, source: string): LuckyDrawEntry | null {
    const draws = luckyDrawRepository.listActiveDraws();
    let granted: LuckyDrawEntry | null = null;
    for (const draw of draws) {
      const balance = rewardService.getBalance(customerId);
      if (balance < draw.minimumCoins) continue;
      const subscriber = subscriberRepository.findByCustomerId(customerId)[0] ?? null;
      const entryNumber = luckyDrawRepository.nextEntryNumber(draw.luckyDrawId);
      const entry = luckyDrawRepository.createEntry({
        entryId: generateEntryId(),
        luckyDrawId: draw.luckyDrawId,
        customerId,
        subscriberId: subscriber?.subscriberId ?? null,
        entryNumber,
        source,
      });
      if (entry) granted = entry;
    }
    return granted;
  },

  createManualEntry(luckyDrawId: string, customerId: string): { entry: LuckyDrawEntry | null; reason?: string } {
    const eligibility = this.checkEligibility(luckyDrawId, customerId);
    if (!eligibility) return { entry: null, reason: "NOT_FOUND" };
    if (!eligibility.eligible) return { entry: null, reason: "INSUFFICIENT_COINS" };

    const subscriber = subscriberRepository.findByCustomerId(customerId)[0] ?? null;
    const entryNumber = luckyDrawRepository.nextEntryNumber(luckyDrawId);
    const entry = luckyDrawRepository.createEntry({
      entryId: generateEntryId(),
      luckyDrawId,
      customerId,
      subscriberId: subscriber?.subscriberId ?? null,
      entryNumber,
      source: "MANUAL_ENTRY",
    });
    if (!entry) return { entry: null, reason: "ALREADY_ENTERED" };
    return { entry };
  },

  getWinners(luckyDrawId: string): LuckyDrawWinner[] {
    return luckyDrawRepository.winnersForDraw(luckyDrawId);
  },

  /**
   * Executes an auditable, server-side draw: takes every entry for the draw,
   * uses a CSPRNG (crypto.randomInt) to select winners without replacement,
   * and persists an immutable run + winner records for auditability.
   */
  executeDraw(luckyDrawId: string): { run: ReturnType<typeof luckyDrawRepository.createRun>; winners: LuckyDrawWinner[] } {
    const draw = luckyDrawRepository.findDrawById(luckyDrawId);
    if (!draw) throw new Error("Lucky draw not found");

    const entries = luckyDrawRepository.allEntries(luckyDrawId);
    const prizes = prizeRepository.listActive().filter((p) => p.rank !== null).sort((a, b) => (a.rank! - b.rank!));

    const db = getDb();
    const run = db.transaction(() => {
      const pool = [...entries];
      const winnerCount = Math.min(draw.winnerCount, pool.length, prizes.length);
      const drawRun = luckyDrawRepository.createRun({
        drawRunId: generateDrawRunId(),
        luckyDrawId,
        executedAt: new Date().toISOString(),
        executedBy: "SYSTEM",
        algorithmVersion: ALGORITHM_VERSION,
        totalEntries: entries.length,
        winnerCount,
        status: "COMPLETED",
        auditReference: crypto.randomUUID(),
      });

      const winners: LuckyDrawWinner[] = [];
      for (let rank = 1; rank <= winnerCount; rank++) {
        const idx = crypto.randomInt(0, pool.length);
        const [chosen] = pool.splice(idx, 1);
        const customer = customerRepository.findByCustomerId(chosen.customerId);
        const winner = luckyDrawRepository.createWinner({
          winnerId: generateWinnerId(),
          drawRunId: drawRun.drawRunId,
          customerId: chosen.customerId,
          customerName: customer?.fullName ?? "ATHARX Customer",
          subscriberId: chosen.subscriberId,
          prizeId: prizes[rank - 1].prizeId,
          rank,
          status: "ANNOUNCED",
          selectedAt: new Date().toISOString(),
        });
        winners.push(winner);
      }

      return { run: drawRun, winners };
    });

    return run();
  },
};

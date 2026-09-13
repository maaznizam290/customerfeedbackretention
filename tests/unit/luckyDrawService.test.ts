import { describe, expect, it, beforeAll } from "vitest";
import { luckyDrawService } from "@/services/luckyDrawService";
import { rewardService } from "@/services/rewardService";
import { customerRepository } from "@/repositories/customerRepository";
import { generateCustomerId } from "@/lib/ids";
import { seedLuckyDraw, seedPrizes } from "../helpers/seedFixtures";

function makeCustomer(coins: number) {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Draw Tester",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  if (coins > 0) {
    rewardService.creditReward({ customerId, rewardType: "CAMPAIGN_REWARD", coins, description: "seed" });
  }
  return customerId;
}

beforeAll(() => {
  seedLuckyDraw(10);
  seedPrizes();
});

describe("luckyDrawService", () => {
  it("reports ineligible below the configured minimum Coins", () => {
    const customerId = makeCustomer(4);
    const eligibility = luckyDrawService.checkEligibility("LD-2026-001", customerId)!;
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.coinsRemaining).toBe(6);
  });

  it("reports eligible at or above the minimum", () => {
    const customerId = makeCustomer(10);
    expect(luckyDrawService.checkEligibility("LD-2026-001", customerId)!.eligible).toBe(true);
  });

  it("grants at most one entry per (draw, source) pair even if called repeatedly (no duplicate entries)", () => {
    const customerId = makeCustomer(15);
    const first = luckyDrawService.grantEntryIfEligible(customerId, "PACKAGE_SUBSCRIPTION");
    const second = luckyDrawService.grantEntryIfEligible(customerId, "PACKAGE_SUBSCRIPTION");
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(luckyDrawService.getEntries("LD-2026-001", customerId)).toHaveLength(1);
  });

  it("allows manual entry creation only for eligible customers", () => {
    const ineligible = makeCustomer(2);
    const blocked = luckyDrawService.createManualEntry("LD-2026-001", ineligible);
    expect(blocked.entry).toBeNull();
    expect(blocked.reason).toBe("INSUFFICIENT_COINS");

    const eligible = makeCustomer(20);
    const allowed = luckyDrawService.createManualEntry("LD-2026-001", eligible);
    expect(allowed.entry).not.toBeNull();
  });

  it("executes an auditable server-side draw and never lets the frontend pick winners", () => {
    const winners = [makeCustomer(20), makeCustomer(25), makeCustomer(30), makeCustomer(40)];
    winners.forEach((c) => luckyDrawService.createManualEntry("LD-2026-001", c));

    const { run, winners: drawWinners } = luckyDrawService.executeDraw("LD-2026-001");
    expect(run.totalEntries).toBeGreaterThanOrEqual(4);
    expect(drawWinners).toHaveLength(3);
    expect(new Set(drawWinners.map((w) => w.customerId)).size).toBe(3);
    expect(drawWinners.map((w) => w.rank).sort()).toEqual([1, 2, 3]);

    const persisted = luckyDrawService.getWinners("LD-2026-001");
    expect(persisted).toHaveLength(3);
  });
});

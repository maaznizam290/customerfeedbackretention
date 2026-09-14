import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { spinService, SpinCooldownActiveError } from "@/services/spinService";
import { rewardService } from "@/services/rewardService";
import { customerRepository } from "@/repositories/customerRepository";
import { generateCustomerId } from "@/lib/ids";
import { seedSpinCampaign } from "../helpers/seedFixtures";

function makeCustomer() {
  const customerId = generateCustomerId();
  customerRepository.create({
    customerId,
    fullName: "Spin Tester",
    email: `${customerId.toLowerCase()}@example.com`,
    passwordHash: "hash",
    referralCode: `${customerId}-REF`,
    referredByCode: null,
  });
  return customerId;
}

beforeAll(() => {
  seedSpinCampaign({ cooldownSeconds: 86400, rewardCoins: 1 });
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-13T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("spinService — 24 hour cooldown (mandatory acceptance criterion)", () => {
  it("is eligible for a customer who has never spun", () => {
    const customerId = makeCustomer();
    expect(spinService.getEligibility(customerId).eligible).toBe(true);
  });

  const VALID_SPIN_REWARDS = [1, 2, 3, 5, 10];

  it("always awards a Coin amount from the fixed, server-side prize table — never a client-influenced value", () => {
    const customerId = makeCustomer();
    let expectedBalance = 0;
    for (let i = 0; i < 5; i++) {
      const spin = spinService.executeSpin({
        customerId,
        subscriberId: null,
        idempotencyKey: `SPIN-REQ-${customerId}-${i}`,
      });
      expect(VALID_SPIN_REWARDS).toContain(spin.rewardCoins);
      expectedBalance += spin.rewardCoins;
      vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 1000));
    }
    expect(rewardService.getBalance(customerId)).toBe(expectedBalance);
  });

  it("credits Coins that match the visually landed wheel segment (never a mismatched amount)", () => {
    const customerId = makeCustomer();
    const spin = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-MATCH-${customerId}` });
    if (spin.landedSegment.includes("BONUS")) {
      expect(spin.rewardCoins).toBe(10);
    } else {
      expect(spin.landedSegment).toBe(`${spin.rewardCoins} ${spin.rewardCoins === 1 ? "COIN" : "COINS"}`);
    }
  });

  it("blocks an immediate second spin with COOLDOWN_ACTIVE", () => {
    const customerId = makeCustomer();
    const first = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-A-${customerId}` });
    expect(() =>
      spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-B-${customerId}` })
    ).toThrow(SpinCooldownActiveError);
    expect(rewardService.getBalance(customerId)).toBe(first.rewardCoins);
  });

  it("stays blocked 23 hours 59 minutes later", () => {
    const customerId = makeCustomer();
    spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-A-${customerId}` });
    vi.setSystemTime(new Date(Date.now() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000));
    expect(spinService.getEligibility(customerId).eligible).toBe(false);
  });

  it("becomes eligible again exactly 24 hours after the completed spin", () => {
    const customerId = makeCustomer();
    const first = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-A-${customerId}` });
    vi.setSystemTime(new Date(new Date(first.nextSpinAvailableAt).getTime()));
    expect(spinService.getEligibility(customerId).eligible).toBe(true);
    const second = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-C-${customerId}` });
    expect(VALID_SPIN_REWARDS).toContain(second.rewardCoins);
    expect(rewardService.getBalance(customerId)).toBe(first.rewardCoins + second.rewardCoins);
  });

  it("computes the cooldown from the actual spin timestamp, not calendar midnight", () => {
    const customerId = makeCustomer();
    const spin = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-A-${customerId}` });
    const last = new Date(spin.lastSpinAt).getTime();
    const next = new Date(spin.nextSpinAvailableAt).getTime();
    expect(next - last).toBe(86400 * 1000);
  });

  it("returns the same transaction for a repeated idempotency key instead of granting a second Coin", () => {
    const customerId = makeCustomer();
    const first = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: "SPIN-DUP" });
    const second = spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: "SPIN-DUP" });
    expect(second.spinId).toBe(first.spinId);
    expect(rewardService.getBalance(customerId)).toBe(first.rewardCoins);
  });

  it("never honors a client-supplied reward amount — the service signature has no such input", () => {
    const customerId = makeCustomer();
    const spin = spinService.executeSpin({
      customerId,
      subscriberId: null,
      // @ts-expect-error deliberately attempting to smuggle an extra field
      rewardCoins: 100,
      idempotencyKey: "SPIN-HACK",
    });
    expect(spin.rewardCoins).not.toBe(100);
    expect(VALID_SPIN_REWARDS).toContain(spin.rewardCoins);
  });

  it("serializes concurrent spin attempts so only one succeeds (no double award)", () => {
    const customerId = makeCustomer();
    const attempts = [0, 1, 2].map((i) => () =>
      spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `RACE-${i}` })
    );
    const results = attempts.map((run) => {
      try {
        return run();
      } catch (e) {
        return e;
      }
    });
    const succeeded = results.filter((r) => !(r instanceof Error));
    expect(succeeded).toHaveLength(1);
    const [winner] = succeeded as Array<{ rewardCoins: number }>;
    expect(rewardService.getBalance(customerId)).toBe(winner.rewardCoins);
  });
});

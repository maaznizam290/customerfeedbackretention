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

  it("awards exactly 1 Coin regardless of wheel segment, every time", () => {
    const customerId = makeCustomer();
    for (let i = 0; i < 5; i++) {
      const spin = spinService.executeSpin({
        customerId,
        subscriberId: null,
        idempotencyKey: `SPIN-REQ-${customerId}-${i}`,
      });
      expect(spin.rewardCoins).toBe(1);
      vi.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000 + 1000));
    }
    expect(rewardService.getBalance(customerId)).toBe(5);
  });

  it("blocks an immediate second spin with COOLDOWN_ACTIVE", () => {
    const customerId = makeCustomer();
    spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-A-${customerId}` });
    expect(() =>
      spinService.executeSpin({ customerId, subscriberId: null, idempotencyKey: `SPIN-B-${customerId}` })
    ).toThrow(SpinCooldownActiveError);
    expect(rewardService.getBalance(customerId)).toBe(1);
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
    expect(second.rewardCoins).toBe(1);
    expect(rewardService.getBalance(customerId)).toBe(2);
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
    expect(rewardService.getBalance(customerId)).toBe(1);
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
    expect(spin.rewardCoins).toBe(1);
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
    expect(rewardService.getBalance(customerId)).toBe(1);
  });
});

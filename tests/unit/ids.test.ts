import { describe, expect, it } from "vitest";
import {
  generateCustomerId,
  generateSubscriberId,
  generateSubscriptionId,
  generateRewardId,
} from "@/lib/ids";

describe("id generators", () => {
  it("produce the documented ATHARX prefixes", () => {
    expect(generateCustomerId()).toMatch(/^CUS-OM-\d{6}$/);
    expect(generateSubscriberId()).toMatch(/^ATH-SUB-\d{6}$/);
    expect(generateSubscriptionId()).toMatch(/^SUB-OMT-\d{6}$/);
    expect(generateRewardId()).toMatch(/^RWD-\d{6}$/);
  });

  it("never repeats a value for the same sequence", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(generateSubscriberId());
    expect(ids.size).toBe(50);
  });

  it("keeps independent sequences per id type", () => {
    const customerId = generateCustomerId();
    const subscriberId = generateSubscriberId();
    // Both start their own counters, so the numeric suffixes can be anything,
    // but the prefixes must never cross-contaminate.
    expect(customerId.startsWith("CUS-OM-")).toBe(true);
    expect(subscriberId.startsWith("ATH-SUB-")).toBe(true);
  });
});

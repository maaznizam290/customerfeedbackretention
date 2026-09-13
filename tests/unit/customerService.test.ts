import { describe, expect, it } from "vitest";
import { customerService, DuplicateEmailError, DuplicateMobileError } from "@/services/customerService";
import { InvalidMsisdnError } from "@/lib/msisdn";
import { rewardService } from "@/services/rewardService";

describe("customerService.signup", () => {
  it("creates a customer + subscriber hierarchy and credits exactly 1 Coin (Acceptance 1-2)", () => {
    const result = customerService.signup({
      fullName: "Ahmed",
      mobile: "+96890000001",
      email: "ahmed.signup.test@example.com",
      password: "Demo@123",
    });

    expect(result.customer.customerId).toMatch(/^CUS-OM-\d{6}$/);
    expect(result.subscriber.subscriberId).toMatch(/^ATH-SUB-\d{6}$/);
    expect(result.subscriber.customerId).toBe(result.customer.customerId);
    expect(result.coinsAwarded).toBe(1);
    expect(result.balance).toBe(1);
    expect(rewardService.getBalance(result.customer.customerId)).toBe(1);
  });

  it("rejects a duplicate email", () => {
    customerService.signup({
      fullName: "Duplicate One",
      mobile: "+96890000002",
      email: "dup.email.test@example.com",
      password: "Demo@123",
    });
    expect(() =>
      customerService.signup({
        fullName: "Duplicate Two",
        mobile: "+96890000003",
        email: "dup.email.test@example.com",
        password: "Demo@123",
      })
    ).toThrow(DuplicateEmailError);
  });

  it("rejects a mobile number already registered by another customer (Rule 3)", () => {
    customerService.signup({
      fullName: "First Owner",
      mobile: "+96890000004",
      email: "first.owner.test@example.com",
      password: "Demo@123",
    });
    expect(() =>
      customerService.signup({
        fullName: "Second Owner",
        mobile: "+96890000004",
        email: "second.owner.test@example.com",
        password: "Demo@123",
      })
    ).toThrow(DuplicateMobileError);
  });

  it("rejects an invalid Oman mobile number", () => {
    expect(() =>
      customerService.signup({
        fullName: "Bad Mobile",
        mobile: "12345",
        email: "bad.mobile.test@example.com",
        password: "Demo@123",
      })
    ).toThrow(InvalidMsisdnError);
  });

  it("verifies the stored password hash rather than plaintext", () => {
    const result = customerService.signup({
      fullName: "Password Test",
      mobile: "+96890000005",
      email: "password.test@example.com",
      password: "Demo@123",
    });
    expect(customerService.verifyPassword(result.customer, "Demo@123")).toBe(true);
    expect(customerService.verifyPassword(result.customer, "WrongPass1")).toBe(false);
    expect(result.customer.passwordHash).not.toContain("Demo@123");
  });
});

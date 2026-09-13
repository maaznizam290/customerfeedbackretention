import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { AppError } from "@/lib/errors";
import { customerRepository } from "@/repositories/customerRepository";
import { subscriberRepository } from "@/repositories/subscriberRepository";
import { getDb } from "@/lib/db";
import { generateCustomerId, generateReferralCode, generateSubscriberId } from "@/lib/ids";
import { normalizeOmanMsisdn } from "@/lib/msisdn";
import { rewardService } from "@/services/rewardService";
import { luckyDrawService } from "@/services/luckyDrawService";
import { analyticsService } from "@/services/analyticsService";
import type { Customer, Subscriber } from "@/types";

export class DuplicateEmailError extends AppError {
  constructor() {
    super("An ATHARX account already exists with this email address.", 409, "DUPLICATE_EMAIL");
  }
}

export class DuplicateMobileError extends AppError {
  constructor() {
    super("This mobile number is already registered with ATHARX.", 409, "DUPLICATE_MOBILE");
  }
}

export interface SignupResult {
  customer: Customer;
  subscriber: Subscriber;
  coinsAwarded: number;
  balance: number;
}

export const customerService = {
  signup(input: {
    fullName: string;
    mobile: string;
    email: string;
    password: string;
    referralCode?: string;
  }): SignupResult {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedMsisdn = normalizeOmanMsisdn(input.mobile);

    if (customerRepository.findByEmail(normalizedEmail)) {
      throw new DuplicateEmailError();
    }
    if (subscriberRepository.findActiveByNormalizedMsisdn(normalizedMsisdn)) {
      throw new DuplicateMobileError();
    }

    const referredBy = input.referralCode
      ? customerRepository.findByReferralCode(input.referralCode.trim())
      : null;

    const db = getDb();
    const run = db.transaction(() => {
      const customerId = generateCustomerId();
      const passwordHash = bcrypt.hashSync(input.password, 10);
      const referralCode = generateReferralCode(input.fullName);

      const customer = customerRepository.create({
        customerId,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        referralCode,
        referredByCode: referredBy ? referredBy.referralCode : null,
      });

      const subscriber = subscriberRepository.create({
        subscriberId: generateSubscriberId(),
        customerId,
        msisdn: input.mobile.trim(),
        normalizedMsisdn,
      });

      const reward = rewardService.creditSignupReward(customerId);

      if (referredBy) {
        rewardService.creditReward({
          customerId: referredBy.customerId,
          rewardType: "REFERRAL_SUCCESS",
          coins: 3,
          description: `Referral reward for inviting ${customer.fullName}`,
        });
        luckyDrawService.grantEntryIfEligible(referredBy.customerId, "REFERRAL_SUCCESS");
      }

      luckyDrawService.grantEntryIfEligible(customerId, "SIGNUP");

      return { customer, subscriber, reward };
    });

    const { customer, subscriber, reward } = run();

    analyticsService.track("signup_completed", {
      customerId: customer.customerId,
      subscriberId: subscriber.subscriberId,
      metadata: { referred: !!referredBy },
    });
    analyticsService.track("reward_awarded", {
      customerId: customer.customerId,
      metadata: { rewardType: "SIGNUP_REWARD", coins: reward.coins },
    });

    return {
      customer,
      subscriber,
      coinsAwarded: reward.coins,
      balance: rewardService.getBalance(customer.customerId),
    };
  },

  verifyPassword(customer: Customer, password: string): boolean {
    return bcrypt.compareSync(password, customer.passwordHash);
  },

  getByCustomerId(customerId: string): Customer | null {
    return customerRepository.findByCustomerId(customerId);
  },

  /**
   * Used only by the subscription-provisioning path when a subscription
   * request arrives for an MSISDN that has no ATHARX profile yet (e.g. a
   * telecom-side triggered subscription rather than a prior web signup).
   * This intentionally does NOT credit a signup reward — that reward is
   * tied to the actual ATHARX signup experience (Rule 1), not to being
   * auto-provisioned as a side effect of a subscription call.
   */
  provisionForSubscription(fullName: string, msisdn: string, normalizedMsisdn: string): {
    customer: Customer;
    subscriber: Subscriber;
  } {
    const db = getDb();
    const run = db.transaction(() => {
      const customerId = generateCustomerId();
      const placeholderEmail = `subscriber.${normalizedMsisdn.replace(/\D/g, "")}@atharx.provisional`;
      const customer = customerRepository.create({
        customerId,
        fullName: fullName.trim() || "ATHARX Subscriber",
        email: placeholderEmail,
        passwordHash: bcrypt.hashSync(crypto.randomUUID(), 10),
        referralCode: generateReferralCode(fullName || "ATHX"),
        referredByCode: null,
      });
      const subscriber = subscriberRepository.create({
        subscriberId: generateSubscriberId(),
        customerId,
        msisdn,
        normalizedMsisdn,
      });
      return { customer, subscriber };
    });
    return run();
  },
};

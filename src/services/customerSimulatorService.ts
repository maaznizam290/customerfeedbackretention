import bcrypt from "bcryptjs";
import { customerRepository } from "@/repositories/customerRepository";
import { subscriberRepository } from "@/repositories/subscriberRepository";
import { packageRepository } from "@/repositories/packageRepository";
import { getDb, nextSequence } from "@/lib/db";
import {
  generateCustomerId,
  generateReferralCode,
  generateSimulationId,
  generateSubscriberId,
} from "@/lib/ids";
import type { Customer } from "@/types";

const FIRST_NAMES = [
  "Ahmed", "Fatima", "Khalid", "Mariam", "Salim", "Aisha", "Yousuf", "Noor",
  "Hamed", "Layla", "Said", "Zainab", "Rashid", "Huda", "Nasser", "Amal",
];
const LAST_NAMES = [
  "Al Balushi", "Al Harthy", "Al Siyabi", "Al Amri", "Al Farsi", "Al Kindi",
  "Al Hinai", "Al Rawahi", "Al Zadjali", "Al Maskari",
];
const ENGAGEMENT_STATUSES = ["ACTIVE", "AT_RISK", "DORMANT"];
const CHURN_SEGMENTS = ["LOW", "MEDIUM", "HIGH"];

const ALLOWED_BATCH_SIZES = [100, 1000, 5000, 10000];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const MSISDN_PREFIXES = ["79", "91", "92", "93", "95", "96", "97", "98", "99"];

/**
 * Deterministically unique, valid-looking Oman mobile numbers — never a
 * real subscriber number. Derived from a monotonic counter (rather than
 * pure randomness) specifically so a 10,000-row batch can never collide
 * with itself or a previous batch: each sequence value maps to exactly one
 * (prefix, local-number) pair across a 9,000,000-number space.
 */
function nextSimulatedMsisdn(): string {
  const seq = nextSequence("simulated_msisdn") - 1; // 0-based
  const prefix = MSISDN_PREFIXES[Math.floor(seq / 1_000_000) % MSISDN_PREFIXES.length];
  const rest = String(seq % 1_000_000).padStart(6, "0");
  return `+968${prefix}${rest}`;
}

/**
 * Generates a batch of simulated prepaid customers, reusing the same
 * `customers`/`subscribers` tables the real signup flow uses (flagged
 * `is_simulated`) rather than a parallel demo-data schema — see
 * ASSESSMENT.md §14. Kept to a demo-appropriate scale (100–10,000), never
 * pretending to model Omantel's actual subscriber base.
 */
export const customerSimulatorService = {
  allowedBatchSizes(): number[] {
    return ALLOWED_BATCH_SIZES;
  },

  generateBatch(count: number): { simulationId: string; generatedAt: string; customers: Customer[] } {
    if (!ALLOWED_BATCH_SIZES.includes(count)) {
      throw new Error(`count must be one of ${ALLOWED_BATCH_SIZES.join(", ")}`);
    }

    const packages = packageRepository.listActive();
    const simulationId = generateSimulationId();
    const generatedAt = new Date().toISOString();

    const db = getDb();
    const run = db.transaction((): Customer[] => {
      const created: Customer[] = [];
      for (let i = 0; i < count; i++) {
        const fullName = `${randomFrom(FIRST_NAMES)} ${randomFrom(LAST_NAMES)}`;
        const customerId = generateCustomerId();
        const email = `${simulationId.toLowerCase()}.${customerId.toLowerCase()}@simulated.atharx.demo`;
        const pkg = packages.length > 0 ? randomFrom(packages) : null;
        const daysSinceRecharge = Math.floor(Math.random() * 45);
        const lastRechargeDate = new Date(Date.now() - daysSinceRecharge * 86400_000).toISOString();
        const packageExpiryDate = pkg
          ? new Date(Date.now() + (Math.random() * 30 - 10) * 86400_000).toISOString()
          : null;

        const customer = customerRepository.createSimulated({
          customerId,
          fullName,
          email,
          passwordHash: bcrypt.hashSync(simulationId, 4),
          referralCode: generateReferralCode(fullName),
          simulationId,
          customerType: "PREPAID",
          currentPackageId: pkg?.packageId ?? null,
          lastRechargeAmount: pkg ? pkg.price : null,
          lastRechargeDate,
          packageExpiryDate,
          monthlyRechargeCount: Math.floor(Math.random() * 4),
          monthlySpend: pkg ? Math.round(pkg.price * (1 + Math.random()) * 100) / 100 : 0,
          engagementStatus: randomFrom(ENGAGEMENT_STATUSES),
          churnSegment: randomFrom(CHURN_SEGMENTS),
        });

        const msisdn = nextSimulatedMsisdn();
        subscriberRepository.create({
          subscriberId: generateSubscriberId(),
          customerId,
          msisdn,
          normalizedMsisdn: msisdn,
        });

        created.push(customer);
      }
      return created;
    });

    const customers = run();
    return { simulationId, generatedAt, customers };
  },
};

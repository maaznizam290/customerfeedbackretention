// ATHARX demo seed script. Run with `npm run seed`.
// Populates the local SQLite database with realistic demo data so the app
// has something to show immediately, without ever colliding with the
// mobile number / email used by the live signup demo journey (Ahmed,
// +96890000000, demo@example.com) which is created fresh through the UI.

import path from "node:path";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";

const DATABASE_FILE = process.env.DATABASE_FILE || "./db/atharx.db";
const dbFile = path.isAbsolute(DATABASE_FILE) ? DATABASE_FILE : path.join(process.cwd(), DATABASE_FILE);
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf-8"));

const now = () => new Date().toISOString();
function seq(name: string): number {
  db.prepare(
    "INSERT INTO id_counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1"
  ).run(name);
  const row = db.prepare("SELECT value FROM id_counters WHERE name = ?").get(name) as { value: number };
  return row.value;
}
const pad = (n: number, w: number) => String(n).padStart(w, "0");

console.log(`Seeding ATHARX database at ${dbFile} ...`);

const seedTx = db.transaction(() => {
  // ---- Packages ----
  const packages = [
    {
      packageId: "OMT-SILVER-03",
      name: "Silver",
      description: "A light starter plan for everyday calls and browsing.",
      price: 3,
      localMinutes: 250,
      dataGb: 5,
      sms: 50,
      validityDays: 14,
      campaignRewardCoins: 1,
      badge: null,
    },
    {
      packageId: "OMT-GOLD-05",
      name: "Gold",
      description: "The most popular ATHARX prepaid plan — balanced minutes, data and SMS.",
      price: 5,
      localMinutes: 500,
      dataGb: 10,
      sms: 100,
      validityDays: 30,
      campaignRewardCoins: 2,
      badge: "MOST POPULAR",
    },
    {
      packageId: "OMT-PLATINUM-10",
      name: "Platinum",
      description: "Our richest prepaid plan for heavy data and call users.",
      price: 10,
      localMinutes: 1000,
      dataGb: 30,
      sms: 200,
      validityDays: 30,
      campaignRewardCoins: 5,
      badge: "BEST VALUE",
    },
    {
      packageId: "OMT-DATA-04",
      name: "Data Boost",
      description: "A data-only add-on plan for customers who mostly need mobile internet.",
      price: 4,
      localMinutes: 0,
      dataGb: 20,
      sms: 0,
      validityDays: 30,
      campaignRewardCoins: 2,
      badge: "DATA ONLY",
    },
    {
      packageId: "OMT-TALK-02",
      name: "National Talk",
      description: "Unlimited-style national calling plan for talk-heavy customers.",
      price: 2,
      localMinutes: 800,
      dataGb: 1,
      sms: 20,
      validityDays: 14,
      campaignRewardCoins: 1,
      badge: null,
    },
  ];
  for (const p of packages) {
    db.prepare(
      `INSERT INTO packages (package_id, name, description, price, currency, local_minutes, data_gb, sms, validity_days, campaign_reward_coins, badge, status, created_at, updated_at)
       VALUES (@packageId, @name, @description, @price, 'OMR', @localMinutes, @dataGb, @sms, @validityDays, @campaignRewardCoins, @badge, 'ACTIVE', @now, @now)`
    ).run({ ...p, now: now() });
  }

  // ---- Campaigns ----
  const campaigns = [
    {
      campaignId: "CMP-WELCOME-001",
      name: "ATHARX Welcome Reward",
      category: "Signup",
      campaignType: "SIGNUP",
      description: "Join ATHARX and receive a welcome Coin.",
      eligibility: "New ATHARX signups.",
      rewardCoins: 1,
      packageId: null,
    },
    {
      campaignId: "CMP-SILVER-001",
      name: "Silver Package Reward",
      category: "Omantel Prepaid",
      campaignType: "PACKAGE_SUBSCRIPTION",
      description: "Subscribe to the Silver prepaid plan and earn Coins.",
      eligibility: "Active Silver subscribers.",
      rewardCoins: 1,
      packageId: "OMT-SILVER-03",
    },
    {
      campaignId: "CMP-GOLD-001",
      name: "Gold Package Reward",
      category: "Omantel Prepaid",
      campaignType: "PACKAGE_SUBSCRIPTION",
      description: "Subscribe to the Gold prepaid plan and earn Coins.",
      eligibility: "Active Gold subscribers.",
      rewardCoins: 2,
      packageId: "OMT-GOLD-05",
    },
    {
      campaignId: "CMP-PLATINUM-001",
      name: "Platinum Package Reward",
      category: "Omantel Prepaid",
      campaignType: "PACKAGE_SUBSCRIPTION",
      description: "Subscribe to the Platinum prepaid plan and earn Coins.",
      eligibility: "Active Platinum subscribers.",
      rewardCoins: 5,
      packageId: "OMT-PLATINUM-10",
    },
    {
      campaignId: "CMP-REFER-001",
      name: "Refer a Friend",
      category: "Referral",
      campaignType: "REFERRAL_SUCCESS",
      description: "Invite a friend to ATHARX. When they join, you earn Coins.",
      eligibility: "Existing ATHARX customers with a valid referral code.",
      rewardCoins: 3,
      packageId: null,
    },
    {
      campaignId: "CMP-RECHARGE-001",
      name: "Weekend Recharge Boost",
      category: "Recharge",
      campaignType: "RECHARGE_THRESHOLD",
      description: "Recharge above the campaign threshold over the weekend to earn bonus Coins. (Demo Campaign Rule — sandbox data.)",
      eligibility: "Demo Campaign Rule: recharge above a configurable threshold.",
      rewardCoins: 2,
      packageId: null,
    },
    {
      campaignId: "CMP-LOYALTY-001",
      name: "Loyalty Streak",
      category: "Limited-Time Offers",
      campaignType: "GENERAL",
      description: "Stay active with ATHARX for consecutive months to unlock bonus Coins. (Demo Campaign Rule — sandbox data.)",
      eligibility: "Demo Campaign Rule: 3 consecutive active months.",
      rewardCoins: 5,
      packageId: null,
    },
  ];
  for (const c of campaigns) {
    db.prepare(
      `INSERT INTO campaigns (campaign_id, name, category, campaign_type, description, eligibility, reward_coins, package_id, start_date, end_date, status, created_at, updated_at)
       VALUES (@campaignId, @name, @category, @campaignType, @description, @eligibility, @rewardCoins, @packageId, @now, NULL, 'ACTIVE', @now, @now)`
    ).run({ ...c, now: now() });
  }

  // ---- VIP Milestone ----
  db.prepare(
    `INSERT INTO reward_milestones (milestone_id, name, required_coins, reward_type, reward_title, description, status, created_at, updated_at)
     VALUES ('VIP-65', 'ATHARX VIP Experience', 65, 'VIP_EXPERIENCE', 'VIP Trip / Luxury Hotel Experience',
             'Reach 65 Coins to become eligible for an exclusive VIP experience. Eligibility unlocked at 65 Coins — the specific prize is configured by the campaign administrator.',
             'ACTIVE', @now, @now)`
  ).run({ now: now() });

  // ---- Prizes ----
  const prizes = [
    { prizeId: "PRIZE-001", name: "iPhone 18 Pro Max", category: "PRODUCT_PRIZE", rank: 1, quantity: 1 },
    { prizeId: "PRIZE-002", name: "iPhone 17 Pro Max", category: "PRODUCT_PRIZE", rank: 2, quantity: 1 },
    { prizeId: "PRIZE-003", name: "Apple Watch", category: "PRODUCT_PRIZE", rank: 3, quantity: 1 },
    { prizeId: "PRIZE-004", name: "VIP Trip / Luxury Hotel Experience", category: "VIP_EXPERIENCE", rank: null, quantity: 1 },
  ];
  for (const p of prizes) {
    db.prepare(
      `INSERT INTO prizes (prize_id, name, description, category, rank, quantity, estimated_value, currency, image_url, status, created_at, updated_at)
       VALUES (@prizeId, @name, @description, @category, @rank, @quantity, NULL, NULL, NULL, 'ACTIVE', @now, @now)`
    ).run({
      ...p,
      description:
        p.category === "VIP_EXPERIENCE"
          ? "Reward configured by the campaign administrator for reaching the VIP milestone."
          : `ATHARX Lucky Draw prize (rank ${p.rank}). Campaign reward — Apple is not necessarily a sponsor of this campaign.`,
      now: now(),
    });
  }

  // ---- Lucky Draw ----
  db.prepare(
    `INSERT INTO lucky_draws (lucky_draw_id, campaign_id, name, minimum_coins, entry_requirement, start_date, end_date, draw_date, winner_count, status, created_at, updated_at)
     VALUES ('LD-2026-001', NULL, 'ATHARX Mega Lucky Draw', 10,
             'Demo Campaign Rule: reach 10 Coins to become eligible for an entry.',
             @now, NULL, '2026-12-31T18:00:00.000Z', 3, 'ACTIVE', @now, @now)`
  ).run({ now: now() });

  // Seeded demo winners from a previous (closed) draw run, clearly marked as demo data.
  db.prepare(
    `INSERT INTO lucky_draws (lucky_draw_id, campaign_id, name, minimum_coins, entry_requirement, start_date, end_date, draw_date, winner_count, status, created_at, updated_at)
     VALUES ('LD-2026-000', NULL, 'ATHARX Lucky Draw — Previous Cycle', 10,
             'Demo Campaign Rule (closed cycle).', @now, @now, '2026-06-30T18:00:00.000Z', 3, 'COMPLETED', @now, @now)`
  ).run({ now: now() });
  db.prepare(
    `INSERT INTO lucky_draw_runs (draw_run_id, lucky_draw_id, executed_at, executed_by, algorithm_version, total_entries, winner_count, status, audit_reference)
     VALUES ('LDR-DEMO-000', 'LD-2026-000', @now, 'SYSTEM', 'v1-crypto-random', 42, 3, 'COMPLETED', 'demo-seed-run')`
  ).run({ now: now() });
  const demoWinners = [
    { winnerId: "LDW-DEMO-001", customerName: "Ahmed", prizeId: "PRIZE-001", rank: 1 },
    { winnerId: "LDW-DEMO-002", customerName: "Fatima", prizeId: "PRIZE-002", rank: 2 },
    { winnerId: "LDW-DEMO-003", customerName: "Khalid", prizeId: "PRIZE-003", rank: 3 },
  ];
  for (const w of demoWinners) {
    db.prepare(
      `INSERT INTO lucky_draw_winners (winner_id, draw_run_id, customer_id, customer_name, subscriber_id, prize_id, rank, status, selected_at)
       VALUES (@winnerId, 'LDR-DEMO-000', 'DEMO-SEED', @customerName, NULL, @prizeId, @rank, 'FULFILLED', @now)`
    ).run({ ...w, now: now() });
  }

  // ---- Spin campaign ----
  db.prepare(
    `INSERT INTO spin_campaigns (spin_campaign_id, name, status, spin_frequency, reward_coins, cooldown_seconds, max_spins_per_customer, start_date, end_date)
     VALUES ('SPIN-DAILY-001', 'ATHARX Daily Spin', 'ACTIVE', 'DAILY', 1, 86400, 1, @now, NULL)`
  ).run({ now: now() });

  // ---- Demo customers, subscribers, subscriptions, rewards ----
  function createCustomer(fullName: string, email: string, mobile: string, password: string) {
    const customerId = `CUS-OM-${pad(seq("customer"), 6)}`;
    const subscriberId = `ATH-SUB-${pad(seq("subscriber"), 6)}`;
    const referralCode = `${fullName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4)}${pad(seq("referral"), 4)}`;
    db.prepare(
      `INSERT INTO customers (customer_id, full_name, email, password_hash, referral_code, referred_by_code, created_at, updated_at)
       VALUES (@customerId, @fullName, @email, @passwordHash, @referralCode, NULL, @now, @now)`
    ).run({
      customerId,
      fullName,
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      referralCode,
      now: now(),
    });
    db.prepare(
      `INSERT INTO subscribers (subscriber_id, customer_id, msisdn, normalized_msisdn, status, created_at, updated_at)
       VALUES (@subscriberId, @customerId, @mobile, @mobile, 'ACTIVE', @now, @now)`
    ).run({ subscriberId, customerId, mobile, now: now() });
    return { customerId, subscriberId };
  }

  function reward(customerId: string, type: string, coins: number, description: string, status = "CREDITED") {
    const rewardId = `RWD-${pad(seq("reward"), 6)}`;
    db.prepare(
      `INSERT INTO rewards (reward_id, customer_id, subscription_id, reward_type, coins, status, description, created_at)
       VALUES (@rewardId, @customerId, NULL, @type, @coins, @status, @description, @now)`
    ).run({ rewardId, customerId, type, coins, description, status, now: now() });
  }

  function subscription(
    customerId: string,
    subscriberId: string,
    packageId: string,
    msisdn: string,
    price: number,
    status: "ACTIVE" | "PENDING" | "CANCELLED" | "FAILED"
  ) {
    const subscriptionId = `SUB-OMT-${pad(seq("subscription"), 6)}`;
    const idempotencyKey = `SEED-${subscriptionId}`;
    const activatedAt = status === "ACTIVE" || status === "CANCELLED" ? now() : null;
    db.prepare(
      `INSERT INTO subscriptions (subscription_id, customer_id, subscriber_id, package_id, msisdn, price, currency, status, idempotency_key, activated_at, expires_at, cancelled_at, created_at, updated_at)
       VALUES (@subscriptionId, @customerId, @subscriberId, @packageId, @msisdn, @price, 'OMR', @status, @idempotencyKey, @activatedAt, NULL, @cancelledAt, @now, @now)`
    ).run({
      subscriptionId,
      customerId,
      subscriberId,
      packageId,
      msisdn,
      price,
      status,
      idempotencyKey,
      activatedAt,
      cancelledAt: status === "CANCELLED" ? now() : null,
      now: now(),
    });
    return subscriptionId;
  }

  // Customer 1: Fatima — engaged, close to VIP ("Almost There").
  const fatima = createCustomer("Fatima Al Harthy", "fatima.demo@atharx.om", "+96891111111", "Demo@123");
  reward(fatima.customerId, "SIGNUP_REWARD", 1, "ATHARX Signup Reward");
  subscription(fatima.customerId, fatima.subscriberId, "OMT-SILVER-03", "+96891111111", 3, "ACTIVE");
  reward(fatima.customerId, "PACKAGE_SUBSCRIPTION_REWARD", 1, "Silver Subscription Reward");
  subscription(fatima.customerId, fatima.subscriberId, "OMT-GOLD-05", "+96891111111", 5, "CANCELLED");
  for (let i = 0; i < 12; i++) reward(fatima.customerId, "SPIN_REWARD", 1, "ATHARX Daily Spin Reward");
  reward(fatima.customerId, "CAMPAIGN_REWARD", 35, "Loyalty Streak Reward (demo)");
  reward(fatima.customerId, "CAMPAIGN_REWARD", 2, "Weekend Recharge Boost", "PENDING");
  db.prepare(`UPDATE lucky_draw_winners SET customer_id = ? WHERE winner_id = 'LDW-DEMO-002'`).run(fatima.customerId);

  // Customer 2: Khalid — VIP-eligible, Platinum subscriber.
  const khalid = createCustomer("Khalid Al Siyabi", "khalid.demo@atharx.om", "+96892222222", "Demo@123");
  reward(khalid.customerId, "SIGNUP_REWARD", 1, "ATHARX Signup Reward");
  subscription(khalid.customerId, khalid.subscriberId, "OMT-PLATINUM-10", "+96892222222", 10, "ACTIVE");
  reward(khalid.customerId, "PACKAGE_SUBSCRIPTION_REWARD", 5, "Platinum Subscription Reward");
  reward(khalid.customerId, "REFERRAL_SUCCESS", 3, "Referral reward for inviting a friend");
  for (let i = 0; i < 20; i++) reward(khalid.customerId, "SPIN_REWARD", 1, "ATHARX Daily Spin Reward");
  reward(khalid.customerId, "CAMPAIGN_REWARD", 36, "Loyalty Streak Reward (demo)");
  db.prepare(`UPDATE lucky_draw_winners SET customer_id = ? WHERE winner_id = 'LDW-DEMO-003'`).run(khalid.customerId);

  // Customer 3: Mariam — new customer, demonstrates PENDING/FAILED subscription states.
  const mariam = createCustomer("Mariam Al Amri", "mariam.demo@atharx.om", "+96893333333", "Demo@123");
  reward(mariam.customerId, "SIGNUP_REWARD", 1, "ATHARX Signup Reward");
  subscription(mariam.customerId, mariam.subscriberId, "OMT-DATA-04", "+96893333333", 4, "PENDING");
  subscription(mariam.customerId, mariam.subscriberId, "OMT-TALK-02", "+96893333333", 2, "FAILED");
  db.prepare(`UPDATE lucky_draw_winners SET customer_id = ? WHERE winner_id = 'LDW-DEMO-001'`).run(mariam.customerId);
});

seedTx();

console.log("Seed complete.");
console.log("Demo accounts (password: Demo@123):");
console.log("  fatima.demo@atharx.om  (Silver active, ~45 Coins — Almost There for VIP)");
console.log("  khalid.demo@atharx.om  (Platinum active, ~65+ Coins — VIP eligible)");
console.log("  mariam.demo@atharx.om  (new customer, 1 Coin, pending/failed subscriptions)");
console.log("Live demo journey uses its own fresh signup (Ahmed / +96890000000 / demo@example.com) via the UI.");

db.close();

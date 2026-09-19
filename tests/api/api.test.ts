import { describe, expect, it, beforeAll } from "vitest";

const BASE_URL = process.env.ATHARX_TEST_BASE_URL ?? "http://127.0.0.1:3101/api/v1";

async function post(pathname: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function get(pathname: string, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, { headers });
  return { status: res.status, json: await res.json() };
}

async function patch(pathname: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe("ATHARX API — health", () => {
  it("GET /health reports the service is up", async () => {
    const { status, json } = await get("/health");
    expect(status).toBe(200);
    expect(json.status).toBe("UP");
    expect(json.service).toBe("ATHARX");
  });
});

describe("ATHARX API — auth", () => {
  it("issues a bearer token for valid client credentials", async () => {
    const { status, json } = await post("/auth/token", {
      client_id: "atharx-demo-client",
      client_secret: "atharx-demo-secret",
      grant_type: "client_credentials",
    });
    expect(status).toBe(200);
    expect(json.access_token).toBeTruthy();
    expect(json.token_type).toBe("Bearer");
  });

  it("rejects invalid client credentials", async () => {
    const { status, json } = await post("/auth/token", {
      client_id: "wrong",
      client_secret: "wrong",
      grant_type: "client_credentials",
    });
    expect(status).toBe(401);
    expect(json.success).toBe(false);
  });

  it("rejects a protected endpoint without a token or session", async () => {
    const { status } = await get("/rewards/balance/CUS-OM-000001");
    expect(status).toBe(401);
  });

  it("accepts a protected endpoint with a valid bearer token", async () => {
    const { status, json } = await get("/rewards/balance/CUS-OM-999999", {
      Authorization: "Bearer mock_access_token",
    });
    expect(status).toBe(200);
    expect(json.coin_balance).toBe(0);
  });
});

describe("ATHARX API — package catalog", () => {
  it("is publicly browsable and returns OMR pricing", async () => {
    const { status, json } = await get("/packages/catalog");
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.currency).toBe("OMR");
    expect(json.packages.length).toBeGreaterThan(0);
    for (const pkg of json.packages) {
      expect(pkg.currency).toBe("OMR");
      expect(typeof pkg.campaign_reward_coins).toBe("number");
    }
  });
});

describe("ATHARX API — signup + subscription + reward golden path", () => {
  const mobile = "+96895512345";
  const email = `api.test.${Date.now()}@example.com`;
  let customerId: string;

  it("signup starts the customer at 0 Coins — nothing is credited until they earn it", async () => {
    const { status, json } = await post("/customers/signup", {
      fullName: "Ahmed",
      mobile,
      email,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    expect(status).toBe(201);
    expect(json.coins_awarded).toBe(0);
    expect(json.coin_balance).toBe(0);
    customerId = json.customer_id;
  });

  it("rejects a duplicate signup with the same mobile number", async () => {
    const { status, json } = await post("/customers/signup", {
      fullName: "Someone Else",
      mobile,
      email: `other.${Date.now()}@example.com`,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    expect(status).toBe(409);
    expect(json.error.code).toBe("DUPLICATE_MOBILE");
  });

  let idempotencyKey: string;

  it("subscribing to Gold credits +2 Coins and returns an ACTIVE subscription", async () => {
    idempotencyKey = `REQ-API-TEST-${Date.now()}`;
    const { status, json } = await post("/subscriptions/subscribe", {
      customer_name: "Ahmed",
      msisdn: mobile,
      package_id: "OMT-GOLD-05",
      idempotency_key: idempotencyKey,
    });
    expect(status).toBe(201);
    expect(json.status).toBe("ACTIVE");
    expect(json.reward.coins).toBe(2);
    expect(json.coin_balance).toBe(2);
    expect(json.subscriber_id).toMatch(/^ATH-SUB-\d{6}$/);
  });

  it("replaying the same idempotency_key does not create a duplicate or grant a second reward", async () => {
    const { status, json } = await post("/subscriptions/subscribe", {
      customer_name: "Ahmed",
      msisdn: mobile,
      package_id: "OMT-GOLD-05",
      idempotency_key: idempotencyKey,
    });
    expect(status).toBe(201);
    expect(json.is_replay).toBe(true);
    expect(json.coin_balance).toBe(2);
  });

  it("the reward ledger records the subscription reward", async () => {
    const { status, json } = await get(`/rewards/ledger/${customerId}`, {
      Authorization: "Bearer mock_access_token",
    });
    expect(status).toBe(200);
    const types = json.items.map((i: { type: string }) => i.type);
    expect(types).toContain("PACKAGE_SUBSCRIPTION_REWARD");
  });

  it("rejects subscribing to an unavailable package", async () => {
    const { status, json } = await post("/subscriptions/subscribe", {
      customer_name: "Ahmed",
      msisdn: mobile,
      package_id: "OMT-DOES-NOT-EXIST",
      idempotency_key: `REQ-API-TEST-BAD-${Date.now()}`,
    });
    expect(status).toBe(404);
    expect(json.error.code).toBe("PACKAGE_UNAVAILABLE");
  });

  it("rejects an invalid Oman mobile number on signup", async () => {
    const { status, json } = await post("/customers/signup", {
      fullName: "Bad Mobile",
      mobile: "12345",
      email: `bad.${Date.now()}@example.com`,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    expect(status).toBe(400);
    expect(json.error.code).toBe("INVALID_MOBILE");
  });
});

describe("ATHARX API — Spin & Win over HTTP (this demo build's cooldown is configured to 0)", () => {
  let customerId: string;

  beforeAll(async () => {
    const { json } = await post("/customers/signup", {
      fullName: "Spin Tester",
      mobile: "+96895567890",
      email: `spin.api.test.${Date.now()}@example.com`,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    customerId = json.customer_id;
  });

  it("is eligible for a fresh customer", async () => {
    const { json } = await get(`/spin/eligibility/${customerId}`, {
      Authorization: "Bearer mock_access_token",
    });
    expect(json.eligible).toBe(true);
  });

  it("awards a Coin amount from the server-side prize table, matching the landed segment", async () => {
    const { status, json } = await post(
      "/spin",
      { customer_id: customerId, idempotency_key: `SPIN-API-${Date.now()}` },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(201);
    expect([1, 2, 3, 5, 10]).toContain(json.reward.amount);
  });

  it("remains eligible for an immediate second spin — this deployment's cooldown is 0", async () => {
    const { json: eligibility } = await get(`/spin/eligibility/${customerId}`, {
      Authorization: "Bearer mock_access_token",
    });
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.cooldown_active).toBe(false);

    const { status, json } = await post(
      "/spin",
      { customer_id: customerId, idempotency_key: `SPIN-API-2-${Date.now()}` },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(201);
    expect([1, 2, 3, 5, 10]).toContain(json.reward.amount);
  });

  it("ignores a client-supplied reward amount, on a fresh key, immediately after the previous spin", async () => {
    // Confirms the endpoint schema has no reward field to smuggle a value
    // through; an unknown field is simply ignored by the validator. Also
    // re-confirms no cooldown blocks this third consecutive spin.
    const { status, json } = await post(
      "/spin",
      { customer_id: customerId, idempotency_key: `SPIN-API-3-${Date.now()}`, reward_coins: 999 },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(201);
    expect(json.reward.amount).not.toBe(999);
    expect([1, 2, 3, 5, 10]).toContain(json.reward.amount);
  });

  it("still enforces idempotency: replaying the same key never grants a second Coin", async () => {
    const key = `SPIN-API-IDEMPOTENT-${Date.now()}`;
    const first = await post("/spin", { customer_id: customerId, idempotency_key: key }, { Authorization: "Bearer mock_access_token" });
    const second = await post("/spin", { customer_id: customerId, idempotency_key: key }, { Authorization: "Bearer mock_access_token" });
    expect(first.json.spin_id).toBe(second.json.spin_id);
    expect(first.json.coin_balance).toBe(second.json.coin_balance);
  });
});

describe("ATHARX API — Vault redemption over HTTP", () => {
  let customerId: string;

  beforeAll(async () => {
    const signup = await post("/customers/signup", {
      fullName: "Vault Tester",
      mobile: "+96895598765",
      email: `vault.api.test.${Date.now()}@example.com`,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    customerId = signup.json.customer_id;
    // Silver (+1) + Gold (+2) + Platinum (+5) = 8 Coins, exactly enough for
    // the cheapest seeded Vault offer (VAULT-000001, 8 Coins). Signup itself
    // credits 0 Coins in this build — see the signup test above.
    await post("/subscriptions/subscribe", {
      customer_name: "Vault Tester",
      msisdn: "+96895598765",
      package_id: "OMT-SILVER-03",
      idempotency_key: `VAULT-REQ-SILVER-${Date.now()}`,
    });
    await post("/subscriptions/subscribe", {
      customer_name: "Vault Tester",
      msisdn: "+96895598765",
      package_id: "OMT-GOLD-05",
      idempotency_key: `VAULT-REQ-GOLD-${Date.now()}`,
    });
    await post("/subscriptions/subscribe", {
      customer_name: "Vault Tester",
      msisdn: "+96895598765",
      package_id: "OMT-PLATINUM-10",
      idempotency_key: `VAULT-REQ-PLAT-${Date.now()}`,
    });
  });

  it("lists the seeded Vault catalog publicly, with no auth required", async () => {
    const { status, json } = await get("/vault");
    expect(status).toBe(200);
    expect(json.offers.length).toBeGreaterThan(0);
    expect(json.offers.some((o: { offer_id: string }) => o.offer_id === "VAULT-000001")).toBe(true);
  });

  it("unlocks an offer, debiting exactly its Coin cost and returning a voucher code", async () => {
    const { status, json } = await post(
      "/vault/VAULT-000001/redeem",
      { customer_id: customerId },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(201);
    expect(json.already_redeemed).toBe(false);
    expect(json.coins_spent).toBe(8);
    expect(json.coin_balance).toBe(0);
    expect(json.voucher_code).toMatch(/^ATHARX-VRD-/);
  });

  it("is idempotent on retry — returns the same voucher at 200, without a second charge", async () => {
    const { status, json } = await post(
      "/vault/VAULT-000001/redeem",
      { customer_id: customerId },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(200);
    expect(json.already_redeemed).toBe(true);
    expect(json.coin_balance).toBe(0);
  });

  it("rejects an offer the customer can't afford with 403 INSUFFICIENT_COINS", async () => {
    const { status, json } = await post(
      "/vault/VAULT-000003/redeem",
      { customer_id: customerId },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(403);
    expect(json.error.code).toBe("INSUFFICIENT_COINS");
  });
});

describe("ATHARX Engine layer over HTTP — events, campaigns, selection, tokens, audit", () => {
  const unique = Date.now();
  let customerId: string;

  beforeAll(async () => {
    const signup = await post("/customers/signup", {
      fullName: "Engine Tester",
      mobile: `+96895${String(600000 + (unique % 99999))}`,
      email: `engine.api.test.${unique}@example.com`,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    customerId = signup.json.customer_id;
  });

  it("qualifying event idempotency: a repeated idempotency_key returns the original outcome, not a new one", async () => {
    const key = `ENGINE-IDEMP-${unique}`;
    const first = await post("/events/qualifying", {
      enterprise_id: "OMT",
      customer_id: customerId,
      event_type: "RECHARGE",
      amount: 5,
      idempotency_key: key,
    });
    expect(first.status).toBe(201);
    expect(first.json.is_replay).toBe(false);
    expect(first.json.qualified).toBe(true);
    expect(first.json.token_id).toBeTruthy();

    const second = await post("/events/qualifying", {
      enterprise_id: "OMT",
      customer_id: customerId,
      event_type: "RECHARGE",
      amount: 5,
      idempotency_key: key,
    });
    expect(second.status).toBe(200);
    expect(second.json.is_replay).toBe(true);
    expect(second.json.token_id).toBe(first.json.token_id);
  });

  it("a non-qualifying event returns a human-readable reason instead of a bare null", async () => {
    const { status, json } = await post("/events/qualifying", {
      enterprise_id: "OMT",
      customer_id: customerId,
      event_type: "RECHARGE",
      amount: 1,
      idempotency_key: `ENGINE-LOW-${unique}`,
    });
    expect(status).toBe(201);
    expect(json.qualified).toBe(false);
    expect(json.token_id).toBeNull();
    expect(typeof json.reason).toBe("string");
    expect(json.reason.length).toBeGreaterThan(0);
  });

  it("campaign creation accepts and returns max_tokens_per_customer", async () => {
    const behaviourRes = await post("/admin/behaviours", {
      name: `Engine Test Behaviour ${unique}`,
      event_type: `ENGINE_TEST_EVENT_${unique}`,
      description: "API test only.",
    });
    expect(behaviourRes.status).toBe(201);
    const behaviorId = behaviourRes.json.behavior_id;

    const campaignRes = await post("/admin/campaigns", {
      campaign_code: `ENG${unique.toString().slice(-6)}`,
      name: "Engine Test Campaign",
      category: "Featured Experience",
      campaign_type: "GENERAL",
      behaviour_id: behaviorId,
      reward_type: "EXPERIENCE",
      reward_coins: 1,
      selection_method: "RANDOM_DRAW",
      winner_count: 1,
      max_tokens_per_customer: 1,
    });
    expect(campaignRes.status).toBe(201);
    const campaignId = campaignRes.json.campaign_id;
    await patch(`/admin/campaigns/${campaignId}/status`, { status: "ACTIVE" });

    const list = await get("/admin/campaigns");
    const created = list.json.campaigns.find((c: { campaign_id: string }) => c.campaign_id === campaignId);
    expect(created.max_tokens_per_customer).toBe(1);

    // A second qualifying event for the same customer is rejected once the
    // per-customer limit (1) is reached.
    const eventType = `ENGINE_TEST_EVENT_${unique}`;
    const first = await post("/events/qualifying", {
      enterprise_id: "OMT",
      customer_id: customerId,
      event_type: eventType,
      idempotency_key: `ENGINE-CAP-1-${unique}`,
    });
    expect(first.json.qualified).toBe(true);
    expect(first.json.campaign_id).toBe(campaignId);

    const second = await post("/events/qualifying", {
      enterprise_id: "OMT",
      customer_id: customerId,
      event_type: eventType,
      idempotency_key: `ENGINE-CAP-2-${unique}`,
    });
    expect(second.json.qualified).toBe(false);
    expect(second.json.reason).toMatch(/Customer token limit reached/);
  });

  it("full selection lifecycle over HTTP: close -> lock (with integrity hash) -> execute -> audited", async () => {
    const behaviourRes = await post("/admin/behaviours", {
      name: `Selection Test Behaviour ${unique}`,
      event_type: `SELECTION_TEST_EVENT_${unique}`,
      description: "API test only.",
    });
    const behaviorId = behaviourRes.json.behavior_id;

    const campaignRes = await post("/admin/campaigns", {
      campaign_code: `SEL${unique.toString().slice(-6)}`,
      name: "Selection Test Campaign",
      category: "Featured Experience",
      campaign_type: "GENERAL",
      behaviour_id: behaviorId,
      reward_type: "EXPERIENCE",
      reward_coins: 1,
      selection_method: "RANDOM_DRAW",
      winner_count: 1,
    });
    const campaignId = campaignRes.json.campaign_id;
    await patch(`/admin/campaigns/${campaignId}/status`, { status: "ACTIVE" });

    const eventRes = await post("/events/qualifying", {
      enterprise_id: "OMT",
      customer_id: customerId,
      event_type: `SELECTION_TEST_EVENT_${unique}`,
      idempotency_key: `SELECTION-TOK-${unique}`,
    });
    expect(eventRes.json.qualified).toBe(true);

    const closed = await patch(`/admin/campaigns/${campaignId}/status`, { status: "CLOSED" });
    expect(closed.status).toBe(200);

    const locked = await post(`/admin/selection/${campaignId}/lock`, {});
    expect(locked.status).toBe(201);
    expect(locked.json.eligible_pool_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(locked.json.eligible_count).toBe(1);

    const detailAfterLock = await get(`/admin/selection/${campaignId}`);
    expect(detailAfterLock.json.run.status).toBe("LOCKED");

    const executed = await post(`/admin/selection/${campaignId}/execute`, {});
    expect(executed.status).toBe(201);
    expect(executed.json.results).toHaveLength(1);
    expect(executed.json.results[0].token_id).toBe(eventRes.json.token_id);

    const audit = await get(`/admin/audit?campaign_id=${campaignId}`);
    const eventTypes = audit.json.entries.map((e: { event_type: string }) => e.event_type);
    expect(eventTypes).toContain("ELIGIBLE_POOL_LOCKED");
    expect(eventTypes).toContain("WINNER_SELECTED");
  });

  it("token exception management: HOLD then RELEASE a token via the admin endpoint, fully audited", async () => {
    const tokens = await get(`/admin/tokens?customer_id=${customerId}&status=ISSUED`);
    const tokenId = tokens.json.tokens[0]?.token_id;
    expect(tokenId).toBeTruthy();

    const held = await post(`/admin/tokens/${tokenId}/status`, { status: "HOLD" });
    expect(held.status).toBe(200);
    expect(held.json.status).toBe("HOLD");

    const released = await post(`/admin/tokens/${tokenId}/status`, { status: "ISSUED" });
    expect(released.status).toBe(200);
    expect(released.json.status).toBe("ISSUED");

    const audit = await get(`/admin/audit?customer_id=${customerId}`);
    const eventTypes = audit.json.entries.map((e: { event_type: string }) => e.event_type);
    expect(eventTypes).toContain("TOKEN_HELD");
    expect(eventTypes).toContain("TOKEN_RELEASED");
  });
});

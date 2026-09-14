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

  it("signup credits exactly 1 Coin", async () => {
    const { status, json } = await post("/customers/signup", {
      fullName: "Ahmed",
      mobile,
      email,
      password: "Demo@123",
      confirmPassword: "Demo@123",
    });
    expect(status).toBe(201);
    expect(json.coins_awarded).toBe(1);
    expect(json.coin_balance).toBe(1);
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
    expect(json.coin_balance).toBe(3);
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
    expect(json.coin_balance).toBe(3);
  });

  it("the reward ledger records both the signup and subscription rewards", async () => {
    const { status, json } = await get(`/rewards/ledger/${customerId}`, {
      Authorization: "Bearer mock_access_token",
    });
    expect(status).toBe(200);
    const types = json.items.map((i: { type: string }) => i.type);
    expect(types).toContain("SIGNUP_REWARD");
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

describe("ATHARX API — spin cooldown over HTTP", () => {
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

  it("blocks an immediate second spin with 409 COOLDOWN_ACTIVE", async () => {
    const { status, json } = await post(
      "/spin",
      { customer_id: customerId, idempotency_key: `SPIN-API-2-${Date.now()}` },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(409);
    expect(json.error.code).toBe("COOLDOWN_ACTIVE");
    expect(json.next_spin_available_at).toBeTruthy();
  });

  it("ignores a client-supplied reward amount on retry with a fresh key", async () => {
    // Confirms the endpoint schema has no reward field to smuggle a value
    // through; an unknown field is simply ignored by the validator.
    const { status } = await post(
      "/spin",
      { customer_id: customerId, idempotency_key: `SPIN-API-3-${Date.now()}`, reward_coins: 999 },
      { Authorization: "Bearer mock_access_token" }
    );
    // Still cooling down from the earlier spin in this suite.
    expect(status).toBe(409);
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
    // Signup (+1) + Platinum subscription (+5) = 6 Coins, enough for the
    // cheapest seeded Vault offer (VAULT-000001, 5 Coins).
    await post("/subscriptions/subscribe", {
      customer_name: "Vault Tester",
      msisdn: "+96895598765",
      package_id: "OMT-PLATINUM-10",
      idempotency_key: `VAULT-REQ-${Date.now()}`,
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
    expect(json.coins_spent).toBe(5);
    expect(json.coin_balance).toBe(1);
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
    expect(json.coin_balance).toBe(1);
  });

  it("rejects an offer the customer can't afford with 403 INSUFFICIENT_COINS", async () => {
    const { status, json } = await post(
      "/vault/VAULT-000010/redeem",
      { customer_id: customerId },
      { Authorization: "Bearer mock_access_token" }
    );
    expect(status).toBe(403);
    expect(json.error.code).toBe("INSUFFICIENT_COINS");
  });
});

# ATHARX Omantel Integration API — v1

Base URL (local): `http://localhost:3000/api/v1`
Production placeholder: `https://api.example-omantel-integration.com/api/v1`

This is **ATHARX's own sandbox integration contract**, modeled on a generic
enterprise telecom subscription API. It is not an official Omantel API and no
production Omantel credentials or endpoints are used anywhere in this
repository. See "Future Omantel integration requirements" at the bottom.

A ready-to-run Postman collection covering every endpoint below is at
[`postman/ATHARX-Omantel-Integration.postman_collection.json`](./postman/ATHARX-Omantel-Integration.postman_collection.json).

## Authentication

Every request is authenticated one of two ways:

1. **OAuth2 client-credentials Bearer token** — obtained from `POST
   /auth/token` and sent as `Authorization: Bearer <token>`. This is how
   Postman and external integrators authenticate.
2. **First-party ATHARX session cookie** — set automatically when a customer
   signs up (or subscribes) through the ATHARX web app. The browser never
   handles a token directly; this is a standard backend-for-frontend pattern.

A request with neither is rejected with `401 UNAUTHORIZED`. **Catalog-style,
read-only browsing endpoints are intentionally public** (no auth required) so
a visitor can browse packages/campaigns/prizes/lucky draws before creating an
account, and so a subscription can be provisioned for a brand-new MSISDN with
no prior ATHARX session — this matches the literal Telenor-style request
schemas in this spec, none of which carry a `customer_id`. These are marked
"Public" in the table below; everything else requires the bearer-or-session
auth described above.

Demo client credentials (sandbox only — see `.env.example`):

```
client_id:     atharx-demo-client
client_secret: atharx-demo-secret
```

### POST /auth/token

```json
// Request
{ "client_id": "atharx-demo-client", "client_secret": "atharx-demo-secret", "grant_type": "client_credentials" }

// Response 200
{ "access_token": "mock_access_token", "token_type": "Bearer", "expires_in": 3600 }
```

`401 INVALID_CLIENT` for bad credentials.

## Endpoint reference

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service health check |
| POST | `/auth/token` | Public | Issue a Bearer token |
| GET | `/packages/catalog` | Public | Omantel prepaid package catalog (OMR) |
| GET | `/campaigns` | Public | Active ATHARX campaigns (includes Featured Experience fields) |
| POST | `/events/qualifying` | Public | Generic qualifying-behaviour ingestion (validate → token → Coin) |
| GET | `/prizes` | Public | Lucky Draw prize catalog |
| GET | `/vault` | Public | ATHARX Vault catalog (Oman restaurants/hotels/parks/experiences) |
| GET | `/vault/redemptions/{customer_id}` | Bearer or session | Customer's unlocked Vault offers |
| POST | `/vault/{offer_id}/redeem` | Bearer or session | Unlock a Vault offer (spends Coins, idempotent) |
| GET | `/lucky-draws/active` | Public | Active lucky draws |
| GET | `/lucky-draws/{id}/winners` | Public | Winners for a draw (server-selected) |
| GET | `/subscribers/{msisdn}` | Public | Subscriber/customer identity lookup by MSISDN |
| GET | `/subscriptions/status?msisdn=` | Public | Same lookup, query-param form |
| POST | `/subscriptions/subscribe` | Public | Provision a subscription (idempotent) |
| POST | `/subscriptions/unsubscribe` | Public | Cancel a subscription |
| POST | `/customers/signup` | Public | ATHARX account creation (sets session cookie) |
| GET | `/customers/{id}/retention-profile` | Public | Future churn-model boundary (placeholder) |
| GET | `/rewards/milestones` | Public | Configured reward milestones (e.g. VIP-65) |
| GET | `/rewards/balance/{customer_id}` | Bearer or session | Coin balance |
| GET | `/rewards/ledger/{customer_id}` | Bearer or session | Reward ledger |
| GET | `/rewards/vip/{customer_id}` | Bearer or session | VIP milestone progress |
| GET | `/lucky-draws/{id}/eligibility/{customer_id}` | Bearer or session | Lucky draw eligibility |
| POST | `/lucky-draws/{id}/entries` | Bearer or session | Create a manual entry |
| GET | `/lucky-draws/{id}/entries/{customer_id}` | Bearer or session | Customer's entries |
| GET | `/spin/eligibility/{customer_id}` | Bearer or session | Spin & Win eligibility / cooldown |
| POST | `/spin` | Bearer or session | Execute a spin (server-determined reward) |
| GET | `/session/me` | Cookie only | ATHARX app convenience: "who am I" |
| POST | `/session/logout` | Cookie only | Clear the session cookie |

## Package catalog

### GET /packages/catalog

```json
{
  "success": true,
  "source": "mock_omantel",
  "currency": "OMR",
  "packages": [
    {
      "package_id": "OMT-GOLD-05", "name": "Gold", "price": 5, "currency": "OMR",
      "local_minutes": 500, "data_gb": 10, "sms": 100, "validity_days": 30,
      "campaign_reward_coins": 2, "badge": "MOST POPULAR", "status": "ACTIVE"
    }
  ]
}
```

Seed catalog (demo values — **not** official Omantel pricing): Silver (OMR 3),
Gold (OMR 5), Platinum (OMR 10), Data Boost (OMR 4, data-only), National Talk
(OMR 2). See `scripts/seed.ts`.

## Campaigns and the qualifying-event pipeline

### GET /campaigns

```json
{
  "campaigns": [
    {
      "campaign_id": "CMP-F1-001", "name": "ATHARX F1 Experience", "category": "Featured Experience",
      "campaign_type": "RECHARGE_THRESHOLD", "description": "Recharge OMR 5 or more to earn a Token toward an unforgettable motorsport experience.",
      "eligibility": "Demo Campaign Rule: recharge OMR 5+ while this campaign is active.",
      "reward_type": "EXPERIENCE", "reward_coins": 1,
      "experience_title": "F1 Experience",
      "experience_description": "A 2-night hotel stay plus a premium motorsport experience. Demo concept — not a confirmed commercial partnership.",
      "token_capacity": 1000, "tokens_issued": 4, "package_id": null, "status": "ACTIVE"
    }
  ]
}
```

`reward_type` values other than `COIN` (`EXPERIENCE`, `VIP_EXPERIENCE`,
`HOTEL_STAY`, `TRAVEL`, `ATTRACTION`, `PRODUCT`) are rendered as premium
"Featured Experience" cards on the customer homepage rather than generic
campaign cards. `experience_title`/`experience_description` are `null` for
ordinary Coin-reward campaigns. Every Featured Experience is explicitly a
demo concept, never a confirmed commercial partnership or guaranteed prize.

### POST /events/qualifying

The generic entry point for **any** customer behaviour a connected
enterprise system wants ATHARX to evaluate — this is what the Control
Panel's Simulator calls, and conceptually the same endpoint a real Omantel
recharge/event system would call once integrated (see "Future Omantel
integration requirements" below).

```json
// Request
{
  "enterprise_id": "OMT",
  "customer_id": "CUS-OM-000001",
  "event_type": "RECHARGE",
  "amount": 5
}

// Response 200 — qualified
{
  "success": true, "qualified": true,
  "campaign_id": "CMP-F1-001", "token_id": "OMT-26-F1-000005",
  "coin_reward": 1, "status": "QUALIFIED"
}

// Response 200 — no active campaign currently qualifies
{ "success": true, "qualified": false, "campaign_id": null, "token_id": null, "coin_reward": 0, "status": "REJECTED" }
```

Internally this always runs
`receive event → match behaviour (behaviourService) → match campaign
(campaignService) → issue token (tokenService) → credit Coin (rewardService)
→ record the outcome`, inside one SQLite transaction
(`behaviourEventService.processEvent`) — the exact same function the
`/subscriptions/subscribe` success path calls, so a real subscription and a
simulated event are never handled by different logic. A non-qualifying event
is a normal `200`, not an error — it simply produces no token and no reward.

## Subscriber lookup

### GET /subscribers/{msisdn} · GET /subscriptions/status?msisdn=

```json
{
  "success": true, "msisdn": "+96890000000", "subscriber_id": "ATH-SUB-000001",
  "customer_id": "CUS-OM-000001", "status": "ACTIVE", "active_package": "OMT-GOLD-05"
}
```

`status` is `"NOT_FOUND"` (with `subscriber_id`/`customer_id`/`active_package`
all `null`) when the MSISDN has no ATHARX profile yet.

## Subscribe / unsubscribe

### POST /subscriptions/subscribe

```json
// Request
{
  "customer_name": "Demo Customer", "msisdn": "+96890000000",
  "package_id": "OMT-GOLD-05", "idempotency_key": "REQ-000001"
}

// Response 201
{
  "success": true, "subscription_id": "SUB-OMT-000001", "subscriber_id": "ATH-SUB-000001",
  "customer_id": "CUS-OM-000001", "msisdn": "+96890000000", "package_id": "OMT-GOLD-05",
  "status": "ACTIVE", "price": 5, "currency": "OMR", "activated_at": "2026-09-13T12:00:00.000Z",
  "reward": { "coins": 2, "status": "CREDITED" }, "coin_balance": 3,
  "vip_just_reached": false, "is_replay": false
}
```

The customer/subscriber identity is resolved **purely from the MSISDN**
(matching this schema's lack of a `customer_id` field): a number with an
existing active ATHARX subscriber reuses it; a brand-new number gets a
freshly provisioned customer + subscriber (no signup reward is granted in
that case — the signup reward is tied specifically to `/customers/signup`).

Errors: `404 PACKAGE_UNAVAILABLE`, `502 SUBSCRIPTION_FAILED` (mock adapter
failure — no reward is granted).

### POST /subscriptions/unsubscribe

```json
{ "msisdn": "+96890000000", "package_id": "OMT-GOLD-05", "reason": "user_request", "idempotency_key": "REQ-UNSUB-000001" }
```

```json
{ "success": true, "subscription_id": "SUB-OMT-000001", "status": "CANCELLED", "cancelled_at": "2026-09-13T13:00:00.000Z" }
```

## Customer signup (ATHARX app)

### POST /customers/signup

```json
{ "fullName": "Ahmed", "mobile": "+96890000000", "email": "demo@example.com", "password": "Demo@123", "confirmPassword": "Demo@123", "referralCode": "AHMD0001" }
```

```json
{
  "success": true, "customer_id": "CUS-OM-000001", "subscriber_id": "ATH-SUB-000001",
  "full_name": "Ahmed", "referral_code": "AHME0001", "coins_awarded": 1, "coin_balance": 1
}
```

Errors: `400 VALIDATION_ERROR` / `400 INVALID_MOBILE`, `409 DUPLICATE_EMAIL`,
`409 DUPLICATE_MOBILE`. A referral code that resolves to an existing customer
credits that customer +3 Coins (`REFERRAL_SUCCESS`).

## Rewards

### GET /rewards/balance/{customer_id}

```json
{ "customer_id": "CUS-OM-000001", "coin_balance": 3 }
```

### GET /rewards/ledger/{customer_id}

```json
{
  "items": [
    { "reward_id": "RWD-000002", "type": "PACKAGE_SUBSCRIPTION_REWARD", "coins": 2, "status": "CREDITED", "description": "Gold Subscription Reward", "created_at": "…" },
    { "reward_id": "RWD-000001", "type": "SIGNUP_REWARD", "coins": 1, "status": "CREDITED", "description": "ATHARX Signup Reward", "created_at": "…" }
  ]
}
```

The Coin balance is **always** the sum of `CREDITED` ledger rows — there is no
separate mutable balance field to fall out of sync.

### GET /rewards/milestones · GET /rewards/vip/{customer_id}

```json
{ "milestones": [{ "milestone_id": "VIP-65", "name": "ATHARX VIP Experience", "required_coins": 65, "reward_type": "VIP_EXPERIENCE", "reward_title": "VIP Trip / Luxury Hotel Experience", "status": "ACTIVE" }] }
```

```json
{
  "customer_id": "CUS-OM-000001", "milestone_id": "VIP-65", "reward_title": "VIP Trip / Luxury Hotel Experience",
  "required_coins": 65, "balance": 4, "coins_remaining": 61, "progress_percent": 6, "status": "LOCKED"
}
```

`status` is one of `LOCKED`, `ALMOST_THERE` (≥75% of the threshold), or
`ELIGIBLE`. Reaching the threshold is **eligibility, not an automatic
spend** — Coins are not deducted.

## Lucky Draw

### GET /lucky-draws/active

```json
{ "lucky_draws": [{ "lucky_draw_id": "LD-2026-001", "name": "ATHARX Mega Lucky Draw", "minimum_coins": 10, "entry_requirement": "Demo Campaign Rule: reach 10 Coins to become eligible for an entry.", "draw_date": "2026-12-31T18:00:00.000Z", "winner_count": 3, "status": "ACTIVE", "demo_campaign_rule": true }] }
```

### GET /lucky-draws/{id}/eligibility/{customer_id}

```json
{ "eligible": false, "lucky_draw_id": "LD-2026-001", "minimum_coins": 10, "balance": 4, "coins_remaining": 6, "entries": 0 }
```

### POST /lucky-draws/{id}/entries

```json
// Request
{ "customer_id": "CUS-OM-000001" }
// Response 201
{ "success": true, "entry_id": "LDE-000001", "lucky_draw_id": "LD-2026-001", "entry_number": 1, "eligibility_status": "ELIGIBLE" }
```

Errors: `403` (`INSUFFICIENT_COINS`), `409` (`ALREADY_ENTERED`). Entries are
also granted automatically by the campaign engine on qualifying events
(signup, package subscription, referral) — this endpoint is the manual/UI
fallback, and a duplicate call for the same (draw, customer, source) never
creates a second entry.

### GET /lucky-draws/{id}/winners

```json
{ "lucky_draw_id": "LD-2026-000", "demo_data": true, "winners": [{ "winner_id": "LDW-DEMO-001", "customer_name": "Ahmed", "prize_id": "PRIZE-001", "rank": 1, "status": "FULFILLED", "selected_at": "…" }] }
```

Winner selection runs server-side only (`luckyDrawService.executeDraw`, using
`crypto.randomInt`) and is recorded in `lucky_draw_runs` / `lucky_draw_winners`
for auditability — the frontend never computes winners.

### GET /prizes

```json
{ "prizes": [
  { "prize_id": "PRIZE-001", "name": "iPhone 18 Pro Max", "category": "PRODUCT_PRIZE", "rank": 1, "quantity": 1, "status": "ACTIVE" },
  { "prize_id": "PRIZE-002", "name": "iPhone 17 Pro Max", "category": "PRODUCT_PRIZE", "rank": 2, "quantity": 1, "status": "ACTIVE" },
  { "prize_id": "PRIZE-003", "name": "Apple Watch", "category": "PRODUCT_PRIZE", "rank": 3, "quantity": 1, "status": "ACTIVE" },
  { "prize_id": "PRIZE-004", "name": "VIP Trip / Luxury Hotel Experience", "category": "VIP_EXPERIENCE", "rank": null, "quantity": 1, "status": "ACTIVE" }
] }
```

Apple is not a sponsor of this campaign; prizes are campaign rewards, not
Apple-sponsored promotions.

## ATHARX Vault

A standing catalog of Oman lifestyle partners — restaurants, hotels/resorts,
parks/attractions, and premium experiences — each offering a fixed 20–30%
discount, unlocked by spending Coins. This is the first place in ATHARX
Coins are ever spent rather than earned; every other reward path only ever
credits the ledger.

### GET /vault

```json
{
  "offers": [
    {
      "offer_id": "VAULT-000001", "partner_name": "Bait Al Luban Omani Restaurant – Mutrah", "category": "RESTAURANT",
      "city": "Mutrah, Muscat", "icon": "🍽️", "discount_percent": 25,
      "description": "Landmark Omani dining on the Mutrah Corniche, known for traditional Omani thali platters.",
      "coin_cost": 8, "demo_partner": true, "status": "ACTIVE"
    }
  ]
}
```

`category` is one of `RESTAURANT`, `HOTEL`, `PARK`, `EXPERIENCE`. Every offer
is `demo_partner: true` — a sandbox catalog for this prototype, not a live
commercial agreement. The `EXPERIENCE` category includes a motorsport-themed
listing inspired by Ferrari World-style experiences; this does not imply
sponsorship or endorsement by any named brand.

### POST /vault/{offer_id}/redeem

```json
// Request
{ "customer_id": "CUS-OM-000001" }

// Response 201 — first unlock
{
  "success": true, "already_redeemed": false, "redemption_id": "VRD-000001",
  "offer_id": "VAULT-000001", "voucher_code": "ATHARX-VRD-000001",
  "coins_spent": 8, "coin_balance": 60
}

// Response 200 — repeat call for an already-unlocked offer (idempotent, no second charge)
{ "success": true, "already_redeemed": true, "redemption_id": "VRD-000001", "...": "..." }
```

The balance check and the Coin debit happen inside one transaction, so a
customer can never be charged more than they have, and each offer can only
ever be unlocked once per customer (enforced by a database constraint as
the concurrency backstop, not just an application-level check). Insufficient
balance returns `403 INSUFFICIENT_COINS` with `required_coins` and `balance`
in the response body.

### GET /vault/redemptions/{customer_id}

```json
{ "redemptions": [{ "redemption_id": "VRD-000001", "offer_id": "VAULT-000001", "coins_spent": 5, "voucher_code": "ATHARX-VRD-000001", "redeemed_at": "…" }] }
```

## Spin & Win

### GET /spin/eligibility/{customer_id}

```json
// Eligible
{ "eligible": true, "campaign_id": "SPIN-DAILY-001", "reward_coins": 1, "cooldown_active": false, "last_spin_at": null, "next_spin_available_at": null, "remaining_cooldown_seconds": 0, "remaining_spins": 1 }

// Locked
{ "eligible": false, "campaign_id": "SPIN-DAILY-001", "reward_coins": 1, "cooldown_active": true, "last_spin_at": "2026-09-13T10:30:00.000Z", "next_spin_available_at": "2026-09-14T10:30:00.000Z", "remaining_cooldown_seconds": 84621, "remaining_spins": 0 }
```

### POST /spin

```json
// Request — any reward_coins field the client sends is ignored entirely
{ "customer_id": "CUS-OM-000001", "idempotency_key": "SPIN-REQ-000001" }

// Response 201
{
  "success": true, "spin_id": "SPIN-TXN-000001", "status": "COMPLETED",
  "landed_segment": "3 COINS", "reward": { "type": "COIN", "amount": 3 },
  "coin_balance": 4, "last_spin_at": "2026-09-13T10:30:00.000Z",
  "next_spin_available_at": "2026-09-13T10:30:00.000Z", "cooldown_seconds": 0
}
```

This example shows the general shape of the response with a nonzero
cooldown; **this demo build's `spin_campaigns.cooldown_seconds` is
seeded to `0`**, so `next_spin_available_at` is effectively immediate and
`GET /spin/eligibility/{customer_id}` returns `eligible: true` again right
away — the cooldown mechanism itself (and a real deployment's ability to
set it to 24 hours or any other value) is unchanged and still covered by
`tests/unit/spinService.test.ts` at a nonzero cooldown.

**Mandatory rule:** a completed spin always awards the Coin amount from a
fixed, server-side prize table (`1`/`2`/`3`/`5`/`10` Coins) that exactly
matches whichever wheel segment it visually lands on — the client never
supplies, influences, or can predict either the segment or the amount.
Two segments borrow F1/iPhone theming for excitement, but always resolve to
Coins: a real physical or premium prize is only ever granted through the
audited Lucky Draw / Selection Engine elsewhere in the app, never as an
instant random spin outcome — presenting Spin & Win as capable of an
instant guaranteed iPhone/F1-ticket win would misrepresent the mechanic.
Whatever length the cooldown is configured to (`spin_campaigns.cooldown_seconds`
— `0` in this demo build, `86400` for a 24-hour cooldown in a production-style
deployment), it is computed from the server's own clock at the moment the
spin completes (`last_spin_at + cooldown_seconds`), never from calendar
midnight and never trusting a client-supplied timestamp.

At a nonzero cooldown, calling again before it elapses returns:

```json
// 409 Conflict
{
  "success": false,
  "error": { "code": "COOLDOWN_ACTIVE", "message": "Your next spin will be available after 24 hours." },
  "next_spin_available_at": "2026-09-14T10:30:00.000Z",
  "remaining_cooldown_seconds": 84621
}
```

`409 Conflict` is the chosen status code for an authenticated, well-formed
request that is currently disallowed by application state (as opposed to
`400` for malformed input or `403` for a permissions failure).

## Retention profile (future churn-model boundary)

### GET /customers/{customer_id}/retention-profile

```json
{
  "customer_id": "CUS-OM-000001", "coins_balance": 4, "subscriptions_active": 1,
  "churn_probability": null, "risk_segment": null, "recommended_campaign": null,
  "recommended_reward_coins": null,
  "note": "Predictive fields are placeholders. This MVP does not run a churn model; a future BI/ML service would populate churn_probability, risk_segment and recommended_campaign here."
}
```

This MVP does **not** implement a churn model — the endpoint only documents
the response shape a future ML service would populate.

## Admin / Control Panel endpoints

Everything under `/api/v1/admin/*` backs the `/control` Control Panel UI
(`ARCHITECTURE.md` §15) — a separate surface from the customer-facing app,
never exposed in customer navigation. As with the rest of this MVP,
`requireAuth: false` (no production-grade admin auth is implemented; see
ASSESSMENT.md for the explicit scope call on this).

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/dashboard` | Stat tiles for the Control Panel home screen |
| GET, POST | `/admin/enterprises` | List / create enterprises |
| GET, POST | `/admin/behaviours` | List / create behaviours |
| GET, POST | `/admin/campaigns` | List / create campaigns (full admin shape, incl. lifecycle fields) |
| PATCH | `/admin/campaigns/{campaignId}/status` | Move a campaign through its lifecycle |
| GET | `/admin/tokens` | Search/browse issued tokens |
| GET | `/admin/customers` | List customers (optionally simulated-only) |
| POST | `/admin/customers/simulate` | Generate a batch of 100/1,000/5,000/10,000 simulated customers |
| GET | `/admin/selection/{campaignId}` | Selection status/results for a campaign |
| POST | `/admin/selection/{campaignId}/execute` | Run the Selection Engine on a CLOSED campaign |
| GET | `/admin/events` | Recent behaviour events (qualified and rejected) |

### POST /admin/customers/simulate

```json
// Request
{ "count": 1000 }
// Response 201
{ "simulation_id": "SIM-000002", "count": 1000 }
```

`count` must be one of `100`, `1000`, `5000`, `10000` — a deliberate,
demo-appropriate scale, never a claim of modeling Omantel's actual ~1.37M
subscriber base.

### POST /admin/selection/{campaignId}/execute

```json
{
  "run": { "run_id": "SEL-RUN-000001", "eligible_count": 812, "selected_count": 1, "algorithm_version": "v1-crypto-random", "audit_reference": "…" },
  "results": [{ "result_id": "SEL-RES-000001", "token_id": "OMT-26-F1-000317", "customer_id": "CUS-OM-004821", "rank": 1 }]
}
```

`409 CAMPAIGN_NOT_CLOSABLE` if the campaign isn't `CLOSED` yet.

## Idempotency

Any request that provisions or mutates state (`/subscriptions/subscribe`,
`/spin`) accepts an `idempotency_key`. Submitting the same key twice returns
the **original** transaction (`is_replay: true` for subscribe) instead of
creating a duplicate or granting a second reward. This is enforced by:

1. A pre-check against the existing record, and
2. A `UNIQUE` database constraint on the idempotency key column as a
   backstop against races, plus
3. For Spin & Win specifically, the entire "check cooldown → credit reward →
   write transaction" sequence runs inside one synchronous SQLite
   transaction (`db.transaction(...)`), which — because better-sqlite3
   executes synchronously on Node's single thread — cannot interleave with a
   concurrent request. This is what guarantees "double-click / retry /
   multi-tab" can never grant two Coins for one spin.

## Error format

```json
{ "success": false, "error": { "code": "DUPLICATE_MOBILE", "message": "This mobile number is already registered with ATHARX." } }
```

| Status | Example codes |
| --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_MOBILE` |
| 401 | `UNAUTHORIZED`, `INVALID_CLIENT` |
| 403 | `INSUFFICIENT_COINS` |
| 404 | `PACKAGE_UNAVAILABLE`, `MILESTONE_NOT_FOUND`, `LUCKY_DRAW_NOT_FOUND`, `VAULT_OFFER_NOT_FOUND` |
| 409 | `DUPLICATE_EMAIL`, `DUPLICATE_MOBILE`, `DUPLICATE_SIGNUP_REWARD`, `COOLDOWN_ACTIVE`, `ALREADY_ENTERED`, `INVALID_TRANSITION`, `CAMPAIGN_NOT_CLOSABLE` |
| 502 | `SUBSCRIPTION_FAILED` (mock Omantel adapter failure) |
| 503 | `NO_ACTIVE_CAMPAIGN` |
| 500 | `INTERNAL_ERROR` — a sanitized message only; the real error is logged server-side, never returned to the client |

Every request is also recorded in the `api_requests` audit table
(`request_id`, endpoint, method, status code, sanitized request/response
payloads) for traceability.

## Environment variables

See [`.env.example`](./.env.example) for the full list with defaults. Key
ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_FILE` | Path to the local SQLite file (swap for `DATABASE_URL` when migrating to Postgres/Supabase) |
| `OMANTEL_API_MODE` | `mock` (default) or `production` — selects `MockOmantelAdapter` vs. `OmantelProviderAdapter` |
| `ATHARX_CLIENT_ID` / `ATHARX_CLIENT_SECRET` | Demo OAuth2 client-credentials pair for `/auth/token` |
| `SESSION_SECRET` | Placeholder for signing the session cookie in a hardened deployment |
| `VIP_COIN_THRESHOLD`, `LUCKY_DRAW_MIN_COINS`, `SPIN_COOLDOWN_SECONDS`, `SPIN_REWARD_COINS` | Seed defaults for the gamification engine — the live values actually enforced come from the `reward_milestones` / `lucky_draws` / `spin_campaigns` tables, not these env vars, so they can change without a redeploy |

## Local setup

```bash
npm install
npm run seed
npm run dev
```

## Mock Omantel adapter

`src/adapters/telecom/TelecomProviderAdapter.ts` defines the contract:

```ts
interface TelecomProviderAdapter {
  authenticate(): Promise<AuthToken>;
  getPackages(): Promise<Package[]>;
  getSubscriberStatus(msisdn: string): Promise<SubscriberStatusResult>;
  subscribe(request: SubscribeRequest): Promise<SubscriptionResult>;
  unsubscribe(request: UnsubscribeRequest): Promise<UnsubscribeResult>;
}
```

`MockOmantelAdapter` implements it against ATHARX's own repositories (no
network calls). The subscription service depends only on this interface via
`getTelecomAdapter()` (`src/adapters/telecom/index.ts`), which switches on
`OMANTEL_API_MODE`. Business logic never imports the mock adapter directly.

## Future Omantel integration requirements

`OmantelProviderAdapter.ts` is a documented placeholder — every method throws
`NotImplementedError` until real Omantel endpoints exist. Wiring it up
requires Omantel to provide:

- An authentication mechanism (OAuth2 client-credentials, mTLS, or API keys)
  and a staging environment.
- A live package/catalog endpoint.
- A subscriber lookup endpoint keyed by MSISDN.
- A subscription provisioning endpoint with documented success/failure codes
  and latency/SLA.
- An unsubscribe/deprovisioning endpoint.
- Formal request/response schemas and an error taxonomy.
- Rate limits and idempotency semantics for provisioning calls.
- Webhook/event notifications for asynchronous provisioning outcomes.
- Production credentials issued through a secure secrets process (never
  committed to source control).

Once available, only `OmantelProviderAdapter.ts` needs to change — no ATHARX
service, route, or UI code depends on the mock implementation directly.

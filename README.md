# ATHARX

**Rewards That Keep You Connected**
*Subscribe. Earn. Save. Stay with Omantel.*

ATHARX is an enterprise-configurable customer engagement and retention engine
that converts desired customer behaviours into measurable rewards, campaign
participation and experiences — demonstrated first against Omantel prepaid,
but not hard-coded to it. It is **not** a generic cashback app: every reward
ties back to a specific, configurable customer behaviour (a recharge, a
package subscription, a referral), issued as a unique, auditable Token,
credited as reusable Coins, and — for limited-inventory experiences —
resolved by a transparent, server-side Selection Engine. See
[ASSESSMENT.md](./ASSESSMENT.md) for the full architecture assessment and the
Token vs. Coin vs. Entry vs. Reward vs. Prize distinction.

The original Coin-based reward economy — signup bonuses, package subscription
rewards, a VIP milestone, an auditable Lucky Draw, and a Spin & Win wheel —
sits on top of a mock Omantel prepaid subscription flow, so the whole
customer journey (subscribe → earn → engage → stay) can be demonstrated end
to end without any live Omantel integration. The **ATHARX Vault** (`/vault`)
adds a spend side to that economy: a catalog of Oman restaurants, hotels/
resorts, parks, and premium experiences, each unlocked by spending Coins for
a 20–50% discount — the first place in ATHARX Coins are ever spent rather
than earned. A separate **ATHARX Control Panel** (`/control`) lets an admin
configure behaviours, launch campaigns, generate simulated customers, and
run winner selection — the same engine a real Omantel event system could
eventually call.

> **This is a prototype/demo.** ATHARX is not connected to any real Omantel
> production system. All package prices, campaign rules, milestone thresholds
> and prize catalogs are seed/demo data. See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
> and [ARCHITECTURE.md](./ARCHITECTURE.md) for the integration-readiness story.

## Quick start

```bash
npm install
cp .env.example .env.local     # already done for this repo; edit if needed
npm run seed                   # populates db/atharx.db with demo data
npm run dev                    # http://localhost:3000
```

Open http://localhost:3000 and click **Create Account** to run the full demo
journey (see "Demo journey" below). Seeded demo accounts are also available —
see "Demo credentials".

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` / `npm run start` | Production build and start |
| `npm run seed` | Seed `db/atharx.db` with demo packages, campaigns, milestones, prizes, a lucky draw, a spin campaign, and 3 demo customers |
| `npm run db:reset` | Delete the local database and reseed it |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (business logic, no server needed) |
| `npm run test:api` | HTTP-level API tests against a real, isolated `next dev` instance |
| `npm run test:e2e` | Playwright end-to-end test of the full demo journey |
| `npm run test:all` | Runs all three test suites in sequence |

## Tech stack

- **Next.js 15 (App Router) + React 18 + TypeScript**, Tailwind CSS, Lucide icons
- **SQLite (better-sqlite3)** as the local/demo persistence layer — schema and
  access patterns are written to translate directly to PostgreSQL/Supabase
  (see `db/schema.sql` and the repository layer)
- **Zod** for request validation
- **Repository → Service → API route** layering, with a dedicated
  **Telecom Adapter** interface so the mock Omantel integration can be
  swapped for a real one without touching business logic (see
  `src/adapters/telecom/`)

## Demo journey

The mandatory demo path (see `tests/e2e/golden-path.spec.ts` for the automated
version):

1. Open ATHARX → click **Create Account**.
2. Sign up (any full name, an Oman mobile number, an email, a password).
3. No reward modal appears — a brand-new customer starts at **🪙 0 Coins**;
   nothing is credited until they actually earn it.
4. Go to **Prepaid Packages** → click **Subscribe** on **Gold — OMR 5**.
5. Confirm the consumer name/mobile (prefilled) → **Subscribe Now**.
6. **Subscription Successful** shows an `ATH-SUB-…` subscriber ID, `ACTIVE`
   status, and **+2 Coins**.
7. The navbar now shows **🪙 2 Coins**; the VIP card shows **2 / 65 Coins**.
8. Go to **Spin & Win** → spin → earn 1–10 Coins depending on the wheel
   segment, credited immediately (no cooldown in this demo build) and
   reflected in the navbar right away.

The engine-layer demo (best shown in `/control`, the ATHARX Control Panel):

9. **Simulator** → pick a customer, the "Recharge OMR 5+" behaviour, and an
    amount ≥ 5 → **SIMULATE BEHAVIOUR** → watch the event qualify, a Token
    (`OMT-26-F1-…`) get issued, and a Coin get credited, live.
10. **Campaigns** → close the F1 Experience campaign once enough Tokens are
    issued → **Selection & Results** → **Execute Selection** → a
    server-side, audited draw picks the winner(s).

## Demo credentials

Seeded via `npm run seed` (password for all: `Demo@123`). These deliberately
use different mobile numbers/emails than the live demo journey above so the
two never collide:

| Email | Mobile | Notable state |
| --- | --- | --- |
| `fatima.demo@atharx.om` | `+96891111111` | Active Silver subscription, ~49 Coins ("Almost There" for VIP) |
| `khalid.demo@atharx.om` | `+96892222222` | Active Platinum subscription, 65 Coins (VIP eligible) |
| `mariam.demo@atharx.om` | `+96893333333` | New customer (1 Coin); has a `PENDING` and a `FAILED` demo subscription |

## Project structure

```
src/
  app/                  Next.js routes: customer-facing pages, /control/*
                         (ATHARX Control Panel), and /api/v1/* route handlers
  components/           Shared UI components
  hooks/                Client-side React context (session, signup modal)
  services/             Business logic — reward engine, campaign engine,
                         subscription flow, VIP/milestone, lucky draw, spin,
                         plus the enterprise-agnostic engine layer: behaviour
                         engine, token engine, qualifying-event pipeline,
                         selection engine, customer simulator
  repositories/         SQL access, one module per table
  adapters/telecom/     TelecomProviderAdapter interface + MockOmantelAdapter
                         + OmantelProviderAdapter (production placeholder)
  lib/                  db connection, id generators, MSISDN rules, session,
                         API auth/response helpers, shared error types
  validations/          Zod schemas
  types/                Domain types (server) and API response types (client)
db/schema.sql           SQLite schema (maps 1:1 to a future Postgres schema)
scripts/seed.ts         Demo data seed script
postman/                ATHARX-Omantel-Integration.postman_collection.json
tests/unit              Vitest — business rules, no server required
tests/api               Vitest — real HTTP requests against an isolated server
tests/e2e               Playwright — full browser journey
```

## Further reading

- [ASSESSMENT.md](./ASSESSMENT.md) — the architecture assessment: current
  vs. proposed domain model, what was kept/refactored, Token vs. Coin vs.
  Entry vs. Reward vs. Prize, campaign lifecycle, full user/admin journeys,
  MVP vs. Phase 2 scope, and documented judgment calls where the brief's
  requirements would otherwise have produced duplicate concepts or unscalable
  logic.
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — endpoints, auth, schemas,
  error codes, idempotency, environment variables, the qualifying-event
  pipeline, admin/Control Panel endpoints, and Omantel integration
  requirements.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system diagram, database schema,
  gamification loop, the enterprise-agnostic engine layer (Token/Behaviour/
  Campaign/Selection), the Control Panel, future AI/BI architecture,
  business rules, Phase 2 roadmap.

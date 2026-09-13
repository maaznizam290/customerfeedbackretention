# ATHARX

**Rewards That Keep You Connected**
*Subscribe. Earn. Save. Stay with Omantel.*

ATHARX is a customer-retention and rewards platform prototype for Omantel prepaid
customers. It layers a Coin-based reward economy — signup bonuses, package
subscription rewards, a VIP milestone, an auditable Lucky Draw, and a daily
Spin & Win — on top of a mock Omantel prepaid subscription flow, so the whole
customer journey (subscribe → earn → engage → stay) can be demonstrated end to
end without any live Omantel integration.

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
3. The **Congratulations! +1 Coin** modal appears → click **OK**.
4. The navbar now shows **🪙 1 Coin**.
5. Go to **Prepaid Packages** → click **Subscribe** on **Gold — OMR 5**.
6. Confirm the consumer name/mobile (prefilled) → **Subscribe Now**.
7. **Subscription Successful** shows an `ATH-SUB-…` subscriber ID, `ACTIVE`
   status, and **+2 Coins**.
8. The navbar now shows **🪙 3 Coins**; the VIP card shows **3 / 65 Coins**.
9. Go to **Spin & Win** → spin once → **+1 Coin** → the wheel locks for 24
   hours with a live countdown, enforced server-side.

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
  app/                  Next.js routes (pages + /api/v1/* route handlers)
  components/           Shared UI components
  hooks/                Client-side React context (session, signup modal)
  services/             Business logic (reward engine, campaign engine,
                         subscription flow, VIP/milestone, lucky draw, spin)
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

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — endpoints, auth, schemas,
  error codes, idempotency, environment variables, Omantel integration
  requirements.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — system diagram, database schema,
  gamification loop, future AI/BI architecture, business rules, Phase 2
  roadmap.

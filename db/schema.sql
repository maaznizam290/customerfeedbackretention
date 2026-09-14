-- ATHARX schema (SQLite for local/demo persistence).
-- Column shapes mirror what a PostgreSQL/Supabase migration would use later;
-- ids are surrogate integers, business identifiers are separate unique string columns
-- so no MSISDN or phone number is ever used as a primary/foreign key.

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_by_code TEXT,
  -- Simulation / prepaid-profile fields. NULL for real signups; populated
  -- only for rows created by the admin customer simulator (is_simulated=1),
  -- which reuses this same table rather than a parallel "fake customers"
  -- schema, so the behaviour/token engine treats simulated and real
  -- customers identically.
  is_simulated INTEGER NOT NULL DEFAULT 0,
  simulation_id TEXT,
  customer_type TEXT NOT NULL DEFAULT 'PREPAID',
  current_package_id TEXT REFERENCES packages(package_id),
  last_recharge_amount REAL,
  last_recharge_date TEXT,
  package_expiry_date TEXT,
  monthly_recharge_count INTEGER NOT NULL DEFAULT 0,
  monthly_spend REAL NOT NULL DEFAULT 0,
  engagement_status TEXT NOT NULL DEFAULT 'ACTIVE',
  churn_segment TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_customers_simulated ON customers(is_simulated);

CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscriber_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  msisdn TEXT NOT NULL,
  normalized_msisdn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Rule 3: one normalized MSISDN maps to one ACTIVE subscriber identity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscribers_active_msisdn
  ON subscribers(normalized_msisdn)
  WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  package_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'OMR',
  local_minutes INTEGER NOT NULL,
  data_gb REAL NOT NULL,
  sms INTEGER NOT NULL,
  validity_days INTEGER NOT NULL,
  campaign_reward_coins INTEGER NOT NULL DEFAULT 0,
  badge TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscriber_id TEXT NOT NULL REFERENCES subscribers(subscriber_id),
  package_id TEXT NOT NULL REFERENCES packages(package_id),
  msisdn TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'OMR',
  status TEXT NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT NOT NULL UNIQUE,
  activated_at TEXT,
  expires_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reward_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscription_id TEXT REFERENCES subscriptions(subscription_id),
  reward_type TEXT NOT NULL,
  coins INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'CREDITED',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

-- Rule 1: signup reward can only be created once per customer.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rewards_one_signup_per_customer
  ON rewards(customer_id)
  WHERE reward_type = 'SIGNUP_REWARD';

CREATE TABLE IF NOT EXISTS enterprises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  enterprise_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Oman',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- A Behaviour is a reusable, configurable qualifying rule (e.g. "Recharge
-- >= OMR 5"). It is deliberately independent of any one campaign so the
-- same rule can back many campaigns over time, and independent of any one
-- enterprise's vocabulary (event_type is generic: RECHARGE, PACKAGE_PURCHASE,
-- RENEWAL, REFERRAL, SIGNUP, PARTNER_PURCHASE, ...).
CREATE TABLE IF NOT EXISTS behaviours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  behavior_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  rule TEXT NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL UNIQUE,
  campaign_code TEXT NOT NULL,
  enterprise_id TEXT NOT NULL DEFAULT 'OMT' REFERENCES enterprises(enterprise_id),
  segment TEXT NOT NULL DEFAULT 'PREPAID',
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  behaviour_id TEXT REFERENCES behaviours(behavior_id),
  description TEXT NOT NULL DEFAULT '',
  eligibility TEXT NOT NULL DEFAULT '',
  reward_type TEXT NOT NULL DEFAULT 'COIN',
  reward_coins INTEGER NOT NULL DEFAULT 0,
  experience_title TEXT,
  experience_description TEXT,
  token_capacity INTEGER,
  selection_method TEXT NOT NULL DEFAULT 'ALL_ELIGIBLE',
  winner_count INTEGER NOT NULL DEFAULT 1,
  package_id TEXT REFERENCES packages(package_id),
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Every qualifying customer behaviour is logged here, whether it ultimately
-- qualified for a campaign or not — this is the raw event stream the token
-- engine and (later) any BI/churn pipeline reads from.
CREATE TABLE IF NOT EXISTS behaviour_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(enterprise_id),
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscriber_id TEXT,
  behavior_id TEXT REFERENCES behaviours(behavior_id),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  qualified INTEGER NOT NULL DEFAULT 0,
  campaign_id TEXT REFERENCES campaigns(campaign_id),
  token_id TEXT,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_behaviour_events_customer ON behaviour_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_behaviour_events_campaign ON behaviour_events(campaign_id);

-- A Token is the unique, traceable record of ONE qualifying event for ONE
-- campaign — distinct from Coins (the fungible loyalty balance in
-- `rewards`). Format: {ENTERPRISE}-{YY}-{CAMPAIGN_CODE}-{SEQUENCE}, e.g.
-- OMT-26-F1-000001. Always generated server-side (tokenService), never by
-- the frontend.
CREATE TABLE IF NOT EXISTS tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_id TEXT NOT NULL UNIQUE,
  enterprise_id TEXT NOT NULL REFERENCES enterprises(enterprise_id),
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscriber_id TEXT,
  campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id),
  -- Soft reference only (no FK): the behaviour_events row is written after
  -- the token, once the full outcome is known, so it cannot exist yet at
  -- token-insert time.
  behaviour_event_id TEXT,
  status TEXT NOT NULL DEFAULT 'ISSUED',
  issued_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tokens_campaign ON tokens(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_tokens_customer ON tokens(customer_id);

-- Generalized selection/draw engine: any campaign with token_capacity and
-- selection_method='RANDOM_DRAW' can be closed and run through here. This
-- is the same audit shape as lucky_draw_runs/lucky_draw_winners (kept
-- separate below for backward compatibility with the existing Lucky Draw
-- feature) generalized to any campaign's token pool.
CREATE TABLE IF NOT EXISTS selection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(campaign_id),
  eligible_count INTEGER NOT NULL,
  selected_count INTEGER NOT NULL,
  executed_at TEXT NOT NULL,
  executed_by TEXT NOT NULL DEFAULT 'ADMIN',
  algorithm_version TEXT NOT NULL DEFAULT 'v1-crypto-random',
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  audit_reference TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS selection_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  result_id TEXT NOT NULL UNIQUE,
  run_id TEXT NOT NULL REFERENCES selection_runs(run_id),
  token_id TEXT NOT NULL REFERENCES tokens(token_id),
  customer_id TEXT NOT NULL,
  subscriber_id TEXT,
  rank INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SELECTED',
  selected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL UNIQUE,
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscription_id TEXT REFERENCES subscriptions(subscription_id),
  transaction_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'OMR',
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  reference TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  customer_id TEXT,
  msisdn TEXT,
  status_code INTEGER NOT NULL,
  request_payload TEXT NOT NULL DEFAULT '',
  response_payload TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reward_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  milestone_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  required_coins INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prize_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  rank INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1,
  estimated_value REAL,
  currency TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lucky_draws (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lucky_draw_id TEXT NOT NULL UNIQUE,
  campaign_id TEXT,
  name TEXT NOT NULL,
  minimum_coins INTEGER NOT NULL DEFAULT 0,
  entry_requirement TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT,
  draw_date TEXT,
  winner_count INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lucky_draw_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id TEXT NOT NULL UNIQUE,
  lucky_draw_id TEXT NOT NULL REFERENCES lucky_draws(lucky_draw_id),
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscriber_id TEXT,
  entry_number INTEGER NOT NULL,
  eligibility_status TEXT NOT NULL DEFAULT 'ELIGIBLE',
  source TEXT NOT NULL DEFAULT 'MANUAL',
  created_at TEXT NOT NULL
);

-- A given source event (e.g. one specific subscription) should not double-grant entries.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lucky_draw_entries_unique_source
  ON lucky_draw_entries(lucky_draw_id, customer_id, source);

CREATE TABLE IF NOT EXISTS lucky_draw_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_run_id TEXT NOT NULL UNIQUE,
  lucky_draw_id TEXT NOT NULL REFERENCES lucky_draws(lucky_draw_id),
  executed_at TEXT NOT NULL,
  executed_by TEXT NOT NULL DEFAULT 'SYSTEM',
  algorithm_version TEXT NOT NULL DEFAULT 'v1',
  total_entries INTEGER NOT NULL,
  winner_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  audit_reference TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lucky_draw_winners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  winner_id TEXT NOT NULL UNIQUE,
  draw_run_id TEXT NOT NULL REFERENCES lucky_draw_runs(draw_run_id),
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  subscriber_id TEXT,
  prize_id TEXT NOT NULL REFERENCES prizes(prize_id),
  rank INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ANNOUNCED',
  selected_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spin_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spin_campaign_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  spin_frequency TEXT NOT NULL DEFAULT 'DAILY',
  reward_coins INTEGER NOT NULL DEFAULT 1,
  cooldown_seconds INTEGER NOT NULL DEFAULT 86400,
  max_spins_per_customer INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT
);

CREATE TABLE IF NOT EXISTS spin_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spin_id TEXT NOT NULL UNIQUE,
  spin_campaign_id TEXT NOT NULL REFERENCES spin_campaigns(spin_campaign_id),
  customer_id TEXT NOT NULL REFERENCES customers(customer_id),
  subscriber_id TEXT,
  spin_status TEXT NOT NULL DEFAULT 'COMPLETED',
  reward_coins INTEGER NOT NULL DEFAULT 1,
  reward_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  landed_segment TEXT NOT NULL DEFAULT 'COIN',
  last_spin_at TEXT NOT NULL,
  next_spin_available_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spin_transactions_customer
  ON spin_transactions(customer_id, spin_campaign_id, next_spin_available_at DESC);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  customer_id TEXT,
  subscriber_id TEXT,
  event_name TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS id_counters (
  name TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

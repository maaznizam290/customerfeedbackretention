// Shape of JSON payloads as returned by the ATHARX v1 API, used by client
// components. Kept separate from the domain types in src/types/index.ts,
// which describe internal server-side models.

export interface ApiVaultOffer {
  offer_id: string;
  partner_name: string;
  category: "RESTAURANT" | "HOTEL" | "PARK" | "EXPERIENCE";
  city: string;
  icon: string;
  discount_percent: number;
  description: string;
  coin_cost: number;
  demo_partner: boolean;
  status: string;
}

export interface ApiVaultRedemption {
  redemption_id: string;
  offer_id: string;
  coins_spent: number;
  voucher_code: string;
  redeemed_at: string;
}

export interface ApiVaultRedeemResult {
  success: boolean;
  already_redeemed: boolean;
  redemption_id: string;
  offer_id: string;
  voucher_code: string;
  coins_spent: number;
  coin_balance: number;
}

export interface ApiPackage {
  package_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  local_minutes: number;
  data_gb: number;
  sms: number;
  validity_days: number;
  campaign_reward_coins: number;
  badge: string | null;
  status: string;
}

export interface ApiCampaign {
  campaign_id: string;
  name: string;
  category: string;
  campaign_type: string;
  description: string;
  eligibility: string;
  reward_type: string;
  reward_coins: number;
  experience_title: string | null;
  experience_description: string | null;
  token_capacity: number | null;
  tokens_issued: number;
  package_id: string | null;
  status: string;
}

export interface ApiRewardLedgerItem {
  reward_id: string;
  type: string;
  coins: number;
  status: string;
  description: string;
  created_at: string;
}

export interface ApiVipProgress {
  customer_id: string;
  milestone_id: string;
  reward_title: string;
  required_coins: number;
  balance: number;
  coins_remaining: number;
  progress_percent: number;
  status: "LOCKED" | "ALMOST_THERE" | "ELIGIBLE";
}

export interface ApiPrize {
  prize_id: string;
  name: string;
  description: string;
  category: string;
  rank: number | null;
  quantity: number;
  status: string;
}

export interface ApiLuckyDraw {
  lucky_draw_id: string;
  name: string;
  minimum_coins: number;
  entry_requirement: string;
  draw_date: string | null;
  winner_count: number;
  status: string;
  demo_campaign_rule: boolean;
}

export interface ApiLuckyDrawEligibility {
  eligible: boolean;
  lucky_draw_id: string;
  minimum_coins: number;
  balance: number;
  coins_remaining: number;
  entries: number;
}

export interface ApiLuckyDrawWinner {
  winner_id: string;
  customer_name: string;
  prize_id: string;
  rank: number;
  status: string;
  selected_at: string;
}

export interface ApiSpinEligibility {
  eligible: boolean;
  campaign_id: string | null;
  reward_coins: number;
  cooldown_active: boolean;
  last_spin_at: string | null;
  next_spin_available_at: string | null;
  remaining_cooldown_seconds: number;
  remaining_spins: number;
}

export interface ApiSpinResult {
  success: boolean;
  spin_id: string;
  status: string;
  landed_segment: string;
  reward: { type: string; amount: number };
  coin_balance: number;
  last_spin_at: string;
  next_spin_available_at: string;
  cooldown_seconds: number;
}

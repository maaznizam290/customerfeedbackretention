// Core domain types shared across repositories, services, adapters and API routes.
// Kept framework-agnostic so this layer can be reused if the UI or runtime changes.

export type SubscriptionStatus = "ACTIVE" | "PENDING" | "CANCELLED" | "FAILED";
export type SubscriberStatus = "ACTIVE" | "INACTIVE";
export type RewardStatus = "CREDITED" | "PENDING" | "REVERSED";
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "CLOSED" | "COMPLETED" | "INACTIVE" | "EXPIRED" | "SANDBOX";
export type SelectionMethod = "ALL_ELIGIBLE" | "RANDOM_DRAW";
export type RewardCatalogType =
  | "COIN"
  | "EXPERIENCE"
  | "VIP_EXPERIENCE"
  | "PRODUCT"
  | "CASHBACK"
  | "DISCOUNT"
  | "VOUCHER"
  | "HOTEL_STAY"
  | "TRAVEL"
  | "ATTRACTION";
export type MilestoneStatus = "ACTIVE" | "INACTIVE";
export type LuckyDrawStatus = "ACTIVE" | "CLOSED" | "COMPLETED";
export type SpinStatus = "COMPLETED" | "FAILED";
export type TokenStatus = "RESERVED" | "ISSUED" | "ELIGIBLE" | "HOLD" | "SELECTED" | "EXPIRED" | "CANCELLED";
export type BehaviourEventStatus = "RECEIVED" | "QUALIFIED" | "REJECTED";

export interface Customer {
  id: number;
  customerId: string; // CUS-OM-000001
  fullName: string;
  email: string;
  passwordHash: string;
  referralCode: string;
  referredByCode: string | null;
  // Simulation / prepaid-profile fields — null for real signups.
  isSimulated: boolean;
  simulationId: string | null;
  customerType: string;
  currentPackageId: string | null;
  lastRechargeAmount: number | null;
  lastRechargeDate: string | null;
  packageExpiryDate: string | null;
  monthlyRechargeCount: number;
  monthlySpend: number;
  engagementStatus: string;
  churnSegment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enterprise {
  id: number;
  enterpriseId: string; // OMT
  name: string;
  industry: string;
  country: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface BehaviourRule {
  amount_gte?: number;
  [key: string]: unknown;
}

export interface Behaviour {
  id: number;
  behaviorId: string; // BEH-RECHARGE-005
  name: string;
  eventType: string; // RECHARGE, PACKAGE_PURCHASE, RENEWAL, REFERRAL, SIGNUP, ...
  rule: BehaviourRule;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface BehaviourEvent {
  id: number;
  eventId: string;
  idempotencyKey: string | null;
  enterpriseId: string;
  customerId: string;
  subscriberId: string | null;
  behaviorId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  qualified: boolean;
  campaignId: string | null;
  tokenId: string | null;
  coinReward: number;
  status: BehaviourEventStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface Token {
  id: number;
  tokenId: string; // OMT-26-F1-000001
  enterpriseId: string;
  customerId: string;
  subscriberId: string | null;
  campaignId: string;
  behaviourEventId: string | null;
  status: TokenStatus;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SelectionRun {
  id: number;
  runId: string;
  campaignId: string;
  eligibleCount: number;
  selectedCount: number;
  eligiblePoolHash: string;
  lockedAt: string;
  executedAt: string;
  executedBy: string;
  algorithmVersion: string;
  status: "LOCKED" | "COMPLETED" | "FAILED";
  auditReference: string;
}

export interface SelectionResult {
  id: number;
  resultId: string;
  runId: string;
  tokenId: string;
  customerId: string;
  subscriberId: string | null;
  rank: number;
  status: "SELECTED";
  selectedAt: string;
}

export type VaultOfferCategory = "RESTAURANT" | "HOTEL" | "PARK" | "EXPERIENCE";

export interface VaultOffer {
  id: number;
  offerId: string; // VAULT-000001
  enterpriseId: string;
  partnerName: string;
  category: VaultOfferCategory;
  city: string;
  icon: string;
  discountPercent: number;
  description: string;
  coinCost: number;
  demoPartner: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface VaultRedemption {
  id: number;
  redemptionId: string; // VRD-000001
  offerId: string;
  customerId: string;
  rewardId: string;
  coinsSpent: number;
  voucherCode: string;
  redeemedAt: string;
}

export interface Subscriber {
  id: number;
  subscriberId: string; // ATH-SUB-000001
  customerId: string;
  msisdn: string; // as entered, e.g. +968 9000 0000 (display form kept close to input)
  normalizedMsisdn: string; // +96890000000
  status: SubscriberStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Package {
  id: number;
  packageId: string; // OMT-GOLD-05
  name: string;
  description: string;
  price: number;
  currency: "OMR";
  localMinutes: number;
  dataGb: number;
  sms: number;
  validityDays: number;
  campaignRewardCoins: number;
  badge: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: number;
  subscriptionId: string; // SUB-OMT-000001
  customerId: string;
  subscriberId: string;
  packageId: string;
  msisdn: string;
  price: number;
  currency: "OMR";
  status: SubscriptionStatus;
  idempotencyKey: string;
  activatedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RewardType =
  | "SIGNUP_REWARD"
  | "PACKAGE_SUBSCRIPTION_REWARD"
  | "REFERRAL_SUCCESS"
  | "RECHARGE_THRESHOLD"
  | "PARTNER_PURCHASE"
  | "SPIN_REWARD"
  | "CAMPAIGN_REWARD"
  | "VAULT_REDEMPTION";

export interface Reward {
  id: number;
  rewardId: string; // RWD-000001
  customerId: string;
  subscriptionId: string | null;
  rewardType: RewardType;
  coins: number;
  status: RewardStatus;
  description: string;
  createdAt: string;
}

export type CampaignType =
  | "SIGNUP"
  | "PACKAGE_SUBSCRIPTION"
  | "REFERRAL_SUCCESS"
  | "RECHARGE_THRESHOLD"
  | "PARTNER_PURCHASE"
  | "GENERAL";

export interface Campaign {
  id: number;
  campaignId: string; // CMP-GOLD-001
  campaignCode: string; // short code used in token ids, e.g. "F1", "GOLD"
  enterpriseId: string;
  segment: string;
  name: string;
  category: string;
  campaignType: CampaignType;
  behaviourId: string | null;
  description: string;
  eligibility: string;
  rewardType: RewardCatalogType;
  rewardCoins: number;
  experienceTitle: string | null;
  experienceDescription: string | null;
  tokenCapacity: number | null;
  maxTokensPerCustomer: number | null;
  selectionMethod: SelectionMethod;
  winnerCount: number;
  packageId: string | null;
  startDate: string;
  endDate: string | null;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | "SIGNUP_REWARD"
  | "SUBSCRIPTION"
  | "SUBSCRIPTION_REWARD"
  | "SPIN_REWARD"
  | "LUCKY_DRAW_ENTRY";

export interface AtharxTransaction {
  id: number;
  transactionId: string;
  customerId: string;
  subscriptionId: string | null;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  reference: string;
  createdAt: string;
}

export interface ApiRequestLog {
  id: number;
  requestId: string;
  endpoint: string;
  method: string;
  customerId: string | null;
  msisdn: string | null;
  statusCode: number;
  requestPayload: string;
  responsePayload: string;
  createdAt: string;
}

export interface RewardMilestone {
  id: number;
  milestoneId: string; // VIP-65
  name: string;
  requiredCoins: number;
  rewardType: string; // e.g. VIP_EXPERIENCE
  rewardTitle: string;
  description: string;
  status: MilestoneStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Prize {
  id: number;
  prizeId: string; // PRIZE-001
  name: string;
  description: string;
  category: string;
  rank: number | null;
  quantity: number;
  estimatedValue: number | null;
  currency: string | null;
  imageUrl: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface LuckyDraw {
  id: number;
  luckyDrawId: string; // LD-2026-001
  campaignId: string | null;
  name: string;
  minimumCoins: number;
  entryRequirement: string;
  startDate: string;
  endDate: string | null;
  drawDate: string | null;
  winnerCount: number;
  status: LuckyDrawStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LuckyDrawEntry {
  id: number;
  entryId: string;
  luckyDrawId: string;
  customerId: string;
  subscriberId: string | null;
  entryNumber: number;
  eligibilityStatus: "ELIGIBLE" | "INELIGIBLE";
  source: string; // e.g. SIGNUP, PACKAGE_SUBSCRIPTION, MANUAL
  createdAt: string;
}

export interface LuckyDrawRun {
  id: number;
  drawRunId: string;
  luckyDrawId: string;
  executedAt: string;
  executedBy: string;
  algorithmVersion: string;
  totalEntries: number;
  winnerCount: number;
  status: "COMPLETED" | "FAILED";
  auditReference: string;
}

export interface LuckyDrawWinner {
  id: number;
  winnerId: string;
  drawRunId: string;
  customerId: string;
  customerName: string;
  subscriberId: string | null;
  prizeId: string;
  rank: number;
  status: "ANNOUNCED" | "FULFILLED";
  selectedAt: string;
}

export interface SpinCampaign {
  id: number;
  spinCampaignId: string; // SPIN-DAILY-001
  name: string;
  status: "ACTIVE" | "INACTIVE";
  spinFrequency: "DAILY";
  rewardCoins: number;
  cooldownSeconds: number;
  maxSpinsPerCustomer: number | null;
  startDate: string;
  endDate: string | null;
}

export interface SpinTransaction {
  id: number;
  spinId: string; // SPIN-TXN-000001
  spinCampaignId: string;
  customerId: string;
  subscriberId: string | null;
  spinStatus: SpinStatus;
  rewardCoins: number;
  rewardId: string | null;
  idempotencyKey: string;
  landedSegment: string;
  lastSpinAt: string;
  nextSpinAvailableAt: string;
  createdAt: string;
  completedAt: string;
}

// The centralized audit trail (distinct from AnalyticsEvent below, which is
// a product-analytics/UI-funnel feed, not a compliance record). Every
// integrity-relevant action writes exactly one row here via auditService.
export type AuditEventType =
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_STATUS_CHANGED"
  | "BEHAVIOUR_CREATED"
  | "EVENT_RECEIVED"
  | "EVENT_REJECTED"
  | "TOKEN_ISSUED"
  | "TOKEN_HELD"
  | "TOKEN_RELEASED"
  | "TOKEN_CANCELLED"
  | "ELIGIBLE_POOL_LOCKED"
  | "SELECTION_STARTED"
  | "WINNER_SELECTED"
  | "WINNER_REVALIDATION_FAILED"
  | "ALTERNATE_SELECTED";

export interface AuditLogEntry {
  id: number;
  auditId: string; // AUD-000001
  eventType: AuditEventType;
  enterpriseId: string | null;
  campaignId: string | null;
  customerId: string | null;
  tokenId: string | null;
  actor: string; // ADMIN, SYSTEM, or a future admin-user id
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  systemIdentifier: string;
  createdAt: string;
}

export interface AnalyticsEvent {
  id: number;
  eventId: string;
  customerId: string | null;
  subscriberId: string | null;
  eventName: string;
  metadata: string; // JSON-encoded
  createdAt: string;
}

// ---- Telecom adapter contracts ----

export interface AuthToken {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

export interface SubscriberStatusResult {
  success: boolean;
  msisdn: string;
  subscriber_id: string | null;
  customer_id: string | null;
  status: SubscriberStatus | "NOT_FOUND";
  active_package: string | null;
}

export interface SubscribeRequest {
  customerName: string;
  msisdn: string;
  packageId: string;
  subscriberId: string;
  idempotencyKey: string;
}

export interface SubscriptionResult {
  success: boolean;
  subscription_id: string;
  subscriber_id: string;
  msisdn: string;
  package_id: string;
  status: SubscriptionStatus;
  price: number;
  currency: string;
  activated_at: string;
  error?: string;
}

export interface UnsubscribeRequest {
  msisdn: string;
  packageId: string;
  reason: string;
  idempotencyKey: string;
}

export interface UnsubscribeResult {
  success: boolean;
  subscription_id: string | null;
  status: "CANCELLED" | "NOT_FOUND";
  cancelled_at: string | null;
}

import { packageRepository } from "@/repositories/packageRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { enterpriseRepository } from "@/repositories/enterpriseRepository";
import { behaviourRepository } from "@/repositories/behaviourRepository";
import { milestoneRepository } from "@/repositories/milestoneRepository";
import { spinRepository } from "@/repositories/spinRepository";
import { luckyDrawRepository } from "@/repositories/luckyDrawRepository";
import { prizeRepository } from "@/repositories/prizeRepository";
import { vaultRepository } from "@/repositories/vaultRepository";

const now = () => new Date().toISOString();

export function seedOmantelEnterprise() {
  return enterpriseRepository.create({
    enterpriseId: "OMT",
    name: "Omantel",
    industry: "Telecom",
    country: "Oman",
  });
}

export function seedPackagePurchaseBehaviour() {
  return behaviourRepository.create({
    behaviorId: "BEH-PACKAGE-PURCHASE",
    name: "Purchase Any Prepaid Package",
    eventType: "PACKAGE_PURCHASE",
    rule: {},
    description: "Qualifies whenever a customer subscribes to any prepaid package.",
  });
}

export function seedGoldPackage() {
  return packageRepository.create({
    packageId: "OMT-GOLD-05",
    name: "Gold",
    description: "Balanced minutes, data and SMS.",
    price: 5,
    currency: "OMR",
    localMinutes: 500,
    dataGb: 10,
    sms: 100,
    validityDays: 30,
    campaignRewardCoins: 2,
    badge: null,
    status: "ACTIVE",
  });
}

export function seedInactivePackage() {
  return packageRepository.create({
    packageId: "OMT-RETIRED-01",
    name: "Retired",
    description: "No longer offered.",
    price: 1,
    currency: "OMR",
    localMinutes: 0,
    dataGb: 0,
    sms: 0,
    validityDays: 1,
    campaignRewardCoins: 0,
    badge: null,
    status: "INACTIVE",
  });
}

export function seedGoldCampaign() {
  return campaignRepository.create({
    campaignId: "CMP-GOLD-001",
    campaignCode: "GOLD",
    enterpriseId: "OMT",
    segment: "PREPAID",
    name: "Gold Package Reward",
    category: "Omantel Prepaid",
    campaignType: "PACKAGE_SUBSCRIPTION",
    behaviourId: "BEH-PACKAGE-PURCHASE",
    description: "Subscribe to Gold and earn Coins.",
    eligibility: "Active Gold subscribers.",
    rewardType: "COIN",
    rewardCoins: 2,
    experienceTitle: null,
    experienceDescription: null,
    tokenCapacity: null,
    selectionMethod: "ALL_ELIGIBLE",
    winnerCount: 1,
    packageId: "OMT-GOLD-05",
    startDate: now(),
    endDate: null,
    status: "ACTIVE",
  });
}

export function seedRechargeBehaviour() {
  return behaviourRepository.create({
    behaviorId: "BEH-RECHARGE-005",
    name: "Recharge OMR 5 or More",
    eventType: "RECHARGE",
    rule: { amount_gte: 5 },
    description: "Qualifies whenever a customer recharges at least OMR 5.",
  });
}

export function seedExperienceCampaign(overrides: Partial<{ tokenCapacity: number | null; winnerCount: number }> = {}) {
  return campaignRepository.create({
    campaignId: "CMP-F1-001",
    campaignCode: "F1",
    enterpriseId: "OMT",
    segment: "PREPAID",
    name: "ATHARX F1 Experience",
    category: "Featured Experience",
    campaignType: "RECHARGE_THRESHOLD",
    behaviourId: "BEH-RECHARGE-005",
    description: "Recharge OMR 5+ for a chance at an F1 experience.",
    eligibility: "Any prepaid customer recharging OMR 5 or more.",
    rewardType: "EXPERIENCE",
    rewardCoins: 1,
    experienceTitle: "F1 Experience",
    experienceDescription: "Earn your place in an unforgettable motorsport experience.",
    tokenCapacity: overrides.tokenCapacity ?? 1000,
    selectionMethod: "RANDOM_DRAW",
    winnerCount: overrides.winnerCount ?? 1,
    packageId: null,
    startDate: now(),
    endDate: null,
    status: "ACTIVE",
  });
}

export function seedVaultOffer(overrides: Partial<{ offerId: string; coinCost: number }> = {}) {
  return vaultRepository.create({
    offerId: overrides.offerId ?? "VAULT-000001",
    enterpriseId: "OMT",
    partnerName: "Muscat Bay Grill",
    category: "RESTAURANT",
    city: "Muscat",
    icon: "🍽️",
    discountPercent: 20,
    description: "Test vault offer.",
    coinCost: overrides.coinCost ?? 5,
  });
}

export function seedVipMilestone(requiredCoins = 65) {
  return milestoneRepository.create({
    milestoneId: "VIP-65",
    name: "ATHARX VIP Experience",
    requiredCoins,
    rewardType: "VIP_EXPERIENCE",
    rewardTitle: "VIP Trip / Luxury Hotel Experience",
    description: "Reach the threshold to unlock VIP eligibility.",
    status: "ACTIVE",
  });
}

export function seedSpinCampaign(overrides: Partial<{ cooldownSeconds: number; rewardCoins: number }> = {}) {
  return spinRepository.createCampaign({
    spinCampaignId: "SPIN-DAILY-001",
    name: "ATHARX Daily Spin",
    status: "ACTIVE",
    spinFrequency: "DAILY",
    rewardCoins: overrides.rewardCoins ?? 1,
    cooldownSeconds: overrides.cooldownSeconds ?? 86400,
    maxSpinsPerCustomer: 1,
    startDate: now(),
    endDate: null,
  });
}

export function seedLuckyDraw(minimumCoins = 10) {
  return luckyDrawRepository.createDraw({
    luckyDrawId: "LD-2026-001",
    campaignId: null,
    name: "ATHARX Mega Lucky Draw",
    minimumCoins,
    entryRequirement: "Demo Campaign Rule",
    startDate: now(),
    endDate: null,
    drawDate: null,
    winnerCount: 3,
    status: "ACTIVE",
  });
}

export function seedPrizes() {
  prizeRepository.create({
    prizeId: "PRIZE-001",
    name: "iPhone 18 Pro Max",
    description: "",
    category: "PRODUCT_PRIZE",
    rank: 1,
    quantity: 1,
    estimatedValue: null,
    currency: null,
    imageUrl: null,
    status: "ACTIVE",
  });
  prizeRepository.create({
    prizeId: "PRIZE-002",
    name: "iPhone 17 Pro Max",
    description: "",
    category: "PRODUCT_PRIZE",
    rank: 2,
    quantity: 1,
    estimatedValue: null,
    currency: null,
    imageUrl: null,
    status: "ACTIVE",
  });
  prizeRepository.create({
    prizeId: "PRIZE-003",
    name: "Apple Watch",
    description: "",
    category: "PRODUCT_PRIZE",
    rank: 3,
    quantity: 1,
    estimatedValue: null,
    currency: null,
    imageUrl: null,
    status: "ACTIVE",
  });
}

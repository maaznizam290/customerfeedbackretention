import { packageRepository } from "@/repositories/packageRepository";
import { campaignRepository } from "@/repositories/campaignRepository";
import { milestoneRepository } from "@/repositories/milestoneRepository";
import { spinRepository } from "@/repositories/spinRepository";
import { luckyDrawRepository } from "@/repositories/luckyDrawRepository";
import { prizeRepository } from "@/repositories/prizeRepository";

const now = () => new Date().toISOString();

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
    name: "Gold Package Reward",
    category: "Omantel Prepaid",
    campaignType: "PACKAGE_SUBSCRIPTION",
    description: "Subscribe to Gold and earn Coins.",
    eligibility: "Active Gold subscribers.",
    rewardCoins: 2,
    packageId: "OMT-GOLD-05",
    startDate: now(),
    endDate: null,
    status: "ACTIVE",
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

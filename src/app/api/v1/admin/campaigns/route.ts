import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { campaignService } from "@/services/campaignService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/campaigns",
    method: "GET",
    requireAuth: false,
    handler: async () => ({
      status: 200,
      body: {
        campaigns: campaignService.listAll().map((c) => ({
          campaign_id: c.campaignId,
          campaign_code: c.campaignCode,
          enterprise_id: c.enterpriseId,
          segment: c.segment,
          name: c.name,
          category: c.category,
          campaign_type: c.campaignType,
          behaviour_id: c.behaviourId,
          reward_type: c.rewardType,
          reward_coins: c.rewardCoins,
          experience_title: c.experienceTitle,
          token_capacity: c.tokenCapacity,
          tokens_issued: campaignService.tokensIssued(c.campaignId),
          selection_method: c.selectionMethod,
          winner_count: c.winnerCount,
          package_id: c.packageId,
          status: c.status,
          start_date: c.startDate,
          end_date: c.endDate,
        })),
      },
    }),
  });
}

const createSchema = z.object({
  campaign_code: z.string().trim().min(1).max(12),
  enterprise_id: z.string().trim().default("OMT"),
  segment: z.string().trim().default("PREPAID"),
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  campaign_type: z.enum(["SIGNUP", "PACKAGE_SUBSCRIPTION", "REFERRAL_SUCCESS", "RECHARGE_THRESHOLD", "PARTNER_PURCHASE", "GENERAL"]),
  behaviour_id: z.string().trim().optional(),
  description: z.string().trim().default(""),
  eligibility: z.string().trim().default(""),
  reward_type: z.enum([
    "COIN", "EXPERIENCE", "VIP_EXPERIENCE", "PRODUCT", "CASHBACK", "DISCOUNT", "VOUCHER", "HOTEL_STAY", "TRAVEL", "ATTRACTION",
  ]),
  reward_coins: z.number().int().min(0).default(0),
  experience_title: z.string().trim().optional(),
  experience_description: z.string().trim().optional(),
  token_capacity: z.number().int().min(1).optional(),
  selection_method: z.enum(["ALL_ELIGIBLE", "RANDOM_DRAW"]).default("ALL_ELIGIBLE"),
  winner_count: z.number().int().min(1).default(1),
  package_id: z.string().trim().optional(),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
});

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/campaigns",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = createSchema.parse(raw);
      const campaign = campaignService.create({
        campaignCode: body.campaign_code.toUpperCase(),
        enterpriseId: body.enterprise_id,
        segment: body.segment,
        name: body.name,
        category: body.category,
        campaignType: body.campaign_type,
        behaviourId: body.behaviour_id ?? null,
        description: body.description,
        eligibility: body.eligibility,
        rewardType: body.reward_type,
        rewardCoins: body.reward_coins,
        experienceTitle: body.experience_title ?? null,
        experienceDescription: body.experience_description ?? null,
        tokenCapacity: body.token_capacity ?? null,
        selectionMethod: body.selection_method,
        winnerCount: body.winner_count,
        packageId: body.package_id ?? null,
        startDate: body.start_date ?? new Date().toISOString(),
        endDate: body.end_date ?? null,
      });
      return {
        status: 201,
        requestPayload: raw,
        body: { success: true, campaign_id: campaign.campaignId, status: campaign.status },
      };
    },
  });
}

import { runApiRoute } from "@/lib/apiResponse";
import { customerRepository } from "@/repositories/customerRepository";
import { campaignService } from "@/services/campaignService";
import { tokenRepository } from "@/repositories/tokenRepository";
import { behaviourEventRepository } from "@/repositories/behaviourEventRepository";
import { getDb } from "@/lib/db";

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/dashboard",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const todayIso = startOfTodayIso();
      const coinsToday = getDb()
        .prepare(`SELECT COALESCE(SUM(coins), 0) as c FROM rewards WHERE status = 'CREDITED' AND created_at >= ?`)
        .get(todayIso) as { c: number };

      return {
        status: 200,
        body: {
          total_customers: customerRepository.count(),
          simulated_customers: customerRepository.count(true),
          active_campaigns: campaignService.listAll().filter((c) => c.status === "ACTIVE").length,
          tokens_issued_total: tokenRepository.countAll(),
          tokens_issued_today: tokenRepository.countIssuedSince(todayIso),
          qualifying_events_today: behaviourEventRepository.countQualifiedSince(todayIso),
          coins_distributed_today: coinsToday.c,
        },
      };
    },
  });
}

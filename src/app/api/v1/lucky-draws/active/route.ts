import { runApiRoute } from "@/lib/apiResponse";
import { luckyDrawService } from "@/services/luckyDrawService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/lucky-draws/active",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const draws = luckyDrawService.listActive();
      return {
        status: 200,
        body: {
          lucky_draws: draws.map((d) => ({
            lucky_draw_id: d.luckyDrawId,
            name: d.name,
            minimum_coins: d.minimumCoins,
            entry_requirement: d.entryRequirement,
            draw_date: d.drawDate,
            winner_count: d.winnerCount,
            status: d.status,
            demo_campaign_rule: true,
          })),
        },
      };
    },
  });
}

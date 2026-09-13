import { runApiRoute } from "@/lib/apiResponse";
import { luckyDrawService } from "@/services/luckyDrawService";

export async function GET(request: Request, { params }: { params: Promise<{ luckyDrawId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/lucky-draws/{lucky_draw_id}/winners",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const { luckyDrawId } = await params;
      const winners = luckyDrawService.getWinners(luckyDrawId);
      return {
        status: 200,
        body: {
          lucky_draw_id: luckyDrawId,
          demo_data: luckyDrawId === "LD-2026-000",
          winners: winners.map((w) => ({
            winner_id: w.winnerId,
            customer_name: w.customerName,
            prize_id: w.prizeId,
            rank: w.rank,
            status: w.status,
            selected_at: w.selectedAt,
          })),
        },
      };
    },
  });
}

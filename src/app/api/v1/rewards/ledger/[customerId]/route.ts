import { runApiRoute } from "@/lib/apiResponse";
import { rewardService } from "@/services/rewardService";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/rewards/ledger/{customer_id}",
    method: "GET",
    handler: async () => {
      const { customerId } = await params;
      const ledger = rewardService.getLedger(customerId);
      return {
        status: 200,
        customerIdForLog: customerId,
        body: {
          items: ledger.map((r) => ({
            reward_id: r.rewardId,
            type: r.rewardType,
            coins: r.coins,
            status: r.status,
            description: r.description,
            created_at: r.createdAt,
          })),
        },
      };
    },
  });
}

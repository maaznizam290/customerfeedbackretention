import { runApiRoute } from "@/lib/apiResponse";
import { rewardService } from "@/services/rewardService";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/rewards/balance/{customer_id}",
    method: "GET",
    handler: async () => {
      const { customerId } = await params;
      const balance = rewardService.getBalance(customerId);
      return {
        status: 200,
        customerIdForLog: customerId,
        body: { customer_id: customerId, coin_balance: balance },
      };
    },
  });
}

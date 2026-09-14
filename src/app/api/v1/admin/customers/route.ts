import { runApiRoute } from "@/lib/apiResponse";
import { customerRepository } from "@/repositories/customerRepository";
import { rewardService } from "@/services/rewardService";
import { tokenService } from "@/services/tokenService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/customers",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const url = new URL(request.url);
      const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      const simulatedOnly = url.searchParams.get("simulated") === "true";

      const customers = customerRepository.listPage({ limit, offset, simulatedOnly });
      const total = customerRepository.count(simulatedOnly);

      return {
        status: 200,
        body: {
          total,
          customers: customers.map((c) => ({
            customer_id: c.customerId,
            full_name: c.fullName,
            email: c.email,
            is_simulated: c.isSimulated,
            simulation_id: c.simulationId,
            customer_type: c.customerType,
            current_package_id: c.currentPackageId,
            last_recharge_amount: c.lastRechargeAmount,
            last_recharge_date: c.lastRechargeDate,
            package_expiry_date: c.packageExpiryDate,
            monthly_recharge_count: c.monthlyRechargeCount,
            monthly_spend: c.monthlySpend,
            engagement_status: c.engagementStatus,
            churn_segment: c.churnSegment,
            coin_balance: rewardService.getBalance(c.customerId),
            token_count: tokenService.listByCustomer(c.customerId).length,
          })),
        },
      };
    },
  });
}

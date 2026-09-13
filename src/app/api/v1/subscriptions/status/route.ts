import { runApiRoute } from "@/lib/apiResponse";
import { subscriptionService } from "@/services/subscriptionService";
import { AppError } from "@/lib/errors";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/subscriptions/status",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const url = new URL(request.url);
      const msisdn = url.searchParams.get("msisdn");
      if (!msisdn) {
        throw new AppError("The msisdn query parameter is required.", 400, "VALIDATION_ERROR");
      }
      const status = subscriptionService.getStatusByMsisdn(msisdn);
      if (!status) {
        return {
          status: 200,
          body: { success: true, msisdn, subscriber_id: null, customer_id: null, status: "NOT_FOUND", active_package: null },
        };
      }
      return {
        status: 200,
        body: {
          success: true,
          msisdn: status.msisdn,
          subscriber_id: status.subscriberId,
          customer_id: status.customerId,
          status: status.status,
          active_package: status.activePackage,
        },
      };
    },
  });
}

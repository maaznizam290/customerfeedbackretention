import { runApiRoute } from "@/lib/apiResponse";
import { subscriptionService } from "@/services/subscriptionService";

export async function GET(request: Request, { params }: { params: Promise<{ msisdn: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/subscribers/{msisdn}",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const { msisdn: rawMsisdn } = await params;
      const msisdn = decodeURIComponent(rawMsisdn);
      const status = subscriptionService.getStatusByMsisdn(msisdn);
      if (!status) {
        return {
          status: 200,
          body: {
            success: true,
            msisdn,
            subscriber_id: null,
            customer_id: null,
            status: "NOT_FOUND",
            active_package: null,
          },
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

import { runApiRoute } from "@/lib/apiResponse";
import { retentionProfileService } from "@/services/retentionProfileService";

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/customers/{customer_id}/retention-profile",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const { customerId } = await params;
      const profile = retentionProfileService.getProfile(customerId);
      return { status: 200, customerIdForLog: customerId, body: profile };
    },
  });
}

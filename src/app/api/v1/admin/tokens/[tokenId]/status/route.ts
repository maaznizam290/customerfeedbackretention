import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { tokenService } from "@/services/tokenService";

const bodySchema = z.object({
  status: z.enum(["ISSUED", "HOLD", "CANCELLED"]),
  reason: z.string().trim().optional(),
});

/**
 * Exception management (spec §26): move a not-yet-selected token between
 * ISSUED, HOLD (flagged for review) and CANCELLED. This is the admin
 * action that lets a Selection run's winner revalidation step actually
 * demonstrate an alternate-winner outcome — HOLD a token in the locked
 * pool, then execute selection, and watch it get skipped in favour of an
 * alternate, fully audited either way.
 */
export async function POST(request: Request, { params }: { params: Promise<{ tokenId: string }> }) {
  return runApiRoute({
    request,
    endpoint: "/admin/tokens/{token_id}/status",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const { tokenId } = await params;
      const raw = await request.json();
      const body = bodySchema.parse(raw);
      const token = tokenService.setStatus(tokenId, body.status, "ADMIN", body.reason);
      return {
        status: 200,
        requestPayload: raw,
        body: { success: true, token_id: token.tokenId, status: token.status },
      };
    },
  });
}

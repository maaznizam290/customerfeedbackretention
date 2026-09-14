import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { behaviourService } from "@/services/behaviourService";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/behaviours",
    method: "GET",
    requireAuth: false,
    handler: async () => ({
      status: 200,
      body: {
        behaviours: behaviourService.listAll().map((b) => ({
          behavior_id: b.behaviorId,
          name: b.name,
          event_type: b.eventType,
          rule: b.rule,
          description: b.description,
          status: b.status,
        })),
      },
    }),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2),
  event_type: z.string().trim().min(2),
  amount_gte: z.number().optional(),
  description: z.string().trim().default(""),
});

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/behaviours",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = createSchema.parse(raw);
      const behaviour = behaviourService.create({
        name: body.name,
        eventType: body.event_type.toUpperCase(),
        rule: body.amount_gte !== undefined ? { amount_gte: body.amount_gte } : {},
        description: body.description,
      });
      return {
        status: 201,
        requestPayload: raw,
        body: { success: true, behavior_id: behaviour.behaviorId, name: behaviour.name },
      };
    },
  });
}

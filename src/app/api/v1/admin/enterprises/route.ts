import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { enterpriseRepository } from "@/repositories/enterpriseRepository";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/enterprises",
    method: "GET",
    requireAuth: false,
    handler: async () => ({
      status: 200,
      body: {
        enterprises: enterpriseRepository.listAll().map((e) => ({
          enterprise_id: e.enterpriseId,
          name: e.name,
          industry: e.industry,
          country: e.country,
          status: e.status,
        })),
      },
    }),
  });
}

const createSchema = z.object({
  enterprise_id: z.string().trim().min(2).max(10),
  name: z.string().trim().min(2),
  industry: z.string().trim().min(2),
  country: z.string().trim().min(2).default("Oman"),
});

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/enterprises",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = createSchema.parse(raw);
      const enterprise = enterpriseRepository.create({
        enterpriseId: body.enterprise_id.toUpperCase(),
        name: body.name,
        industry: body.industry,
        country: body.country,
      });
      return {
        status: 201,
        requestPayload: raw,
        body: {
          success: true,
          enterprise_id: enterprise.enterpriseId,
          name: enterprise.name,
        },
      };
    },
  });
}

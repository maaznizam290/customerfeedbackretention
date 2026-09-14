import { z } from "zod";
import { runApiRoute } from "@/lib/apiResponse";
import { customerSimulatorService } from "@/services/customerSimulatorService";
import { AppError } from "@/lib/errors";

const bodySchema = z.object({
  count: z.number().int(),
});

export async function POST(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/admin/customers/simulate",
    method: "POST",
    requireAuth: false,
    handler: async () => {
      const raw = await request.json();
      const body = bodySchema.parse(raw);

      if (!customerSimulatorService.allowedBatchSizes().includes(body.count)) {
        throw new AppError(
          `count must be one of ${customerSimulatorService.allowedBatchSizes().join(", ")}.`,
          400,
          "INVALID_BATCH_SIZE"
        );
      }

      const result = customerSimulatorService.generateBatch(body.count);
      return {
        status: 201,
        requestPayload: raw,
        body: {
          success: true,
          simulation_id: result.simulationId,
          generated_at: result.generatedAt,
          count: result.customers.length,
        },
      };
    },
  });
}

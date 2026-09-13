import { runApiRoute } from "@/lib/apiResponse";
import { prizeRepository } from "@/repositories/prizeRepository";

export async function GET(request: Request) {
  return runApiRoute({
    request,
    endpoint: "/prizes",
    method: "GET",
    requireAuth: false,
    handler: async () => {
      const prizes = prizeRepository.listActive();
      return {
        status: 200,
        body: {
          prizes: prizes.map((p) => ({
            prize_id: p.prizeId,
            name: p.name,
            description: p.description,
            category: p.category,
            rank: p.rank,
            quantity: p.quantity,
            status: p.status,
          })),
        },
      };
    },
  });
}

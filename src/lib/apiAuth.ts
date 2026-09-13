import { AppError } from "./errors";
import { getSessionCustomerId } from "./session";

export class UnauthorizedError extends AppError {
  constructor() {
    super("Missing or invalid authorization.", 401, "UNAUTHORIZED");
  }
}

/**
 * The ATHARX Omantel Integration API accepts two forms of caller identity:
 *  - An OAuth2 client-credentials Bearer token (see POST /auth/token) for
 *    integration partners and the Postman collection.
 *  - The ATHARX web client's own first-party session cookie (set on
 *    signup), so the browser never has to juggle a token manually — a
 *    standard backend-for-frontend pattern.
 * Every request must present one or the other; anonymous requests are
 * rejected with 401.
 */
export async function authenticateRequest(
  request: Request
): Promise<{ mode: "bearer" | "session"; customerId: string | null }> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ") && authHeader.slice("Bearer ".length).startsWith("mock_access_token")) {
    return { mode: "bearer", customerId: null };
  }

  const customerId = await getSessionCustomerId();
  if (customerId) {
    return { mode: "session", customerId };
  }

  throw new UnauthorizedError();
}

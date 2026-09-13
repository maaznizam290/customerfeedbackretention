import { cookies } from "next/headers";

// Lightweight demo session: an httpOnly cookie carrying the ATHARX customer_id.
// This is intentionally NOT a full auth system (per MVP scope) but it is
// server-set persistence, so the customer's identity and Coin balance survive
// a browser refresh without relying on localStorage as the source of truth.

const SESSION_COOKIE = "atharx_session";

export async function setSessionCookie(customerId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, customerId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSessionCustomerId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

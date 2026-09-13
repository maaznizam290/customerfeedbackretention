"use client";

export class ApiError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;

  constructor(message: string, status: number, code: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

/**
 * Thin client-side fetch wrapper for the ATHARX v1 API. The browser
 * authenticates via its first-party session cookie (set on signup), sent
 * automatically with same-origin requests — no manual token handling needed
 * in the UI. External integrators / Postman use the OAuth2 bearer flow
 * documented in API_DOCUMENTATION.md against the same endpoints.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "same-origin",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (data?.error?.message as string | undefined) ??
      "We couldn't complete that request right now. Please try again.";
    const code = (data?.error?.code as string | undefined) ?? "UNKNOWN_ERROR";
    throw new ApiError(message, response.status, code, data);
  }

  return data as T;
}

export function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

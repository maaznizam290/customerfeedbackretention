import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import { apiRequestRepository } from "@/repositories/apiRequestRepository";
import { generateRequestId } from "@/lib/ids";
import { authenticateRequest, UnauthorizedError } from "@/lib/apiAuth";

interface HandlerResult {
  status: number;
  body: unknown;
  requestPayload?: unknown;
  customerIdForLog?: string | null;
  msisdnForLog?: string | null;
}

interface RunOptions {
  request: Request;
  endpoint: string;
  method: string;
  requireAuth?: boolean;
  handler: (ctx: { customerId: string | null }) => Promise<HandlerResult>;
}

/**
 * Shared route-handler runner: enforces the API's auth contract, converts
 * domain errors (AppError subclasses) and validation errors into sanitized,
 * consistent JSON responses (never a raw stack trace — see spec section 32),
 * and writes an audit row to api_requests for every call, mirroring what a
 * production integration gateway would log.
 */
export async function runApiRoute(options: RunOptions): Promise<NextResponse> {
  const requestId = generateRequestId();
  let customerId: string | null = null;

  try {
    if (options.requireAuth !== false) {
      const auth = await authenticateRequest(options.request);
      customerId = auth.customerId;
    }

    const result = await options.handler({ customerId });

    apiRequestRepository.log({
      requestId,
      endpoint: options.endpoint,
      method: options.method,
      customerId: result.customerIdForLog ?? customerId,
      msisdn: result.msisdnForLog ?? null,
      statusCode: result.status,
      requestPayload: result.requestPayload ?? {},
      responsePayload: result.body,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return handleError(error, { requestId, endpoint: options.endpoint, method: options.method, customerId });
  }
}

function handleError(
  error: unknown,
  ctx: { requestId: string; endpoint: string; method: string; customerId: string | null }
): NextResponse {
  if (error instanceof ZodError) {
    const body = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: error.issues[0]?.message ?? "Invalid request.",
        fields: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
    apiRequestRepository.log({
      requestId: ctx.requestId,
      endpoint: ctx.endpoint,
      method: ctx.method,
      customerId: ctx.customerId,
      msisdn: null,
      statusCode: 400,
      requestPayload: {},
      responsePayload: body,
    });
    return NextResponse.json(body, { status: 400 });
  }

  if (error instanceof AppError) {
    const body = {
      success: false,
      error: { code: error.code, message: error.message },
      ...(error.extra ?? {}),
    };
    apiRequestRepository.log({
      requestId: ctx.requestId,
      endpoint: ctx.endpoint,
      method: ctx.method,
      customerId: ctx.customerId,
      msisdn: null,
      statusCode: error.status,
      requestPayload: {},
      responsePayload: body,
    });
    return NextResponse.json(body, { status: error.status });
  }

  // Never leak internals (stack traces, driver errors) to the client.
  console.error(`[ATHARX API] Unhandled error on ${ctx.method} ${ctx.endpoint}:`, error);
  const body = {
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
  };
  apiRequestRepository.log({
    requestId: ctx.requestId,
    endpoint: ctx.endpoint,
    method: ctx.method,
    customerId: ctx.customerId,
    msisdn: null,
    statusCode: 500,
    requestPayload: {},
    responsePayload: body,
  });
  return NextResponse.json(body, { status: 500 });
}

export { UnauthorizedError };

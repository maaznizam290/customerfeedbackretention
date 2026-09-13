import { NextResponse } from "next/server";
import { customerService, DuplicateEmailError, DuplicateMobileError } from "@/services/customerService";
import { InvalidMsisdnError } from "@/lib/msisdn";
import { analyticsService } from "@/services/analyticsService";
import { signupSchema } from "@/validations/schemas";
import { setSessionCookie } from "@/lib/session";
import { AppError } from "@/lib/errors";
import { apiRequestRepository } from "@/repositories/apiRequestRepository";
import { generateRequestId } from "@/lib/ids";
import { ZodError } from "zod";

// ATHARX's own signup endpoint (not part of the Telenor-style telecom
// contract). It is intentionally unauthenticated — a visitor has no session
// or bearer token yet — and issues the first-party session cookie on success.
export async function POST(request: Request) {
  const requestId = generateRequestId();
  const raw = await request.json().catch(() => ({}));

  analyticsService.track("signup_started", {});

  try {
    const input = signupSchema.parse(raw);
    const result = customerService.signup({
      fullName: input.fullName,
      mobile: input.mobile,
      email: input.email,
      password: input.password,
      referralCode: input.referralCode,
    });

    await setSessionCookie(result.customer.customerId);

    const body = {
      success: true,
      customer_id: result.customer.customerId,
      subscriber_id: result.subscriber.subscriberId,
      full_name: result.customer.fullName,
      referral_code: result.customer.referralCode,
      coins_awarded: result.coinsAwarded,
      coin_balance: result.balance,
    };

    apiRequestRepository.log({
      requestId,
      endpoint: "/customers/signup",
      method: "POST",
      customerId: result.customer.customerId,
      msisdn: result.subscriber.normalizedMsisdn,
      statusCode: 201,
      requestPayload: raw,
      responsePayload: body,
    });

    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    let status = 500;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong. Please try again.";

    if (error instanceof ZodError) {
      status = 400;
      code = "VALIDATION_ERROR";
      message = error.issues[0]?.message ?? message;
    } else if (error instanceof AppError) {
      status = error.status;
      code = error.code;
      message = error.message;
    } else if (
      error instanceof DuplicateEmailError ||
      error instanceof DuplicateMobileError ||
      error instanceof InvalidMsisdnError
    ) {
      status = 409;
      code = "CONFLICT";
      message = error.message;
    } else {
      console.error("[ATHARX API] signup error:", error);
    }

    const body = { success: false, error: { code, message } };
    apiRequestRepository.log({
      requestId,
      endpoint: "/customers/signup",
      method: "POST",
      customerId: null,
      msisdn: null,
      statusCode: status,
      requestPayload: raw,
      responsePayload: body,
    });
    return NextResponse.json(body, { status });
  }
}

import { NextResponse } from "next/server";
import { authTokenSchema } from "@/validations/schemas";
import { generateRequestId } from "@/lib/ids";
import { apiRequestRepository } from "@/repositories/apiRequestRepository";

const VALID_CLIENT_ID = process.env.ATHARX_CLIENT_ID || "atharx-demo-client";
const VALID_CLIENT_SECRET = process.env.ATHARX_CLIENT_SECRET || "atharx-demo-secret";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const rawBody = await request.json().catch(() => ({}));

  try {
    const body = authTokenSchema.parse(rawBody);

    if (body.client_id !== VALID_CLIENT_ID || body.client_secret !== VALID_CLIENT_SECRET) {
      const responseBody = {
        success: false,
        error: { code: "INVALID_CLIENT", message: "Invalid client_id or client_secret." },
      };
      apiRequestRepository.log({
        requestId,
        endpoint: "/auth/token",
        method: "POST",
        customerId: null,
        msisdn: null,
        statusCode: 401,
        requestPayload: rawBody,
        responsePayload: responseBody,
      });
      return NextResponse.json(responseBody, { status: 401 });
    }

    const responseBody = {
      access_token: "mock_access_token",
      token_type: "Bearer",
      expires_in: 3600,
    };

    apiRequestRepository.log({
      requestId,
      endpoint: "/auth/token",
      method: "POST",
      customerId: null,
      msisdn: null,
      statusCode: 200,
      requestPayload: rawBody,
      responsePayload: responseBody,
    });

    return NextResponse.json(responseBody, { status: 200 });
  } catch {
    const responseBody = {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "client_id, client_secret and grant_type are required." },
    };
    apiRequestRepository.log({
      requestId,
      endpoint: "/auth/token",
      method: "POST",
      customerId: null,
      msisdn: null,
      statusCode: 400,
      requestPayload: rawBody,
      responsePayload: responseBody,
    });
    return NextResponse.json(responseBody, { status: 400 });
  }
}

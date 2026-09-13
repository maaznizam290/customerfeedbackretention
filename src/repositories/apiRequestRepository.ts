import { getDb } from "@/lib/db";

export const apiRequestRepository = {
  log(entry: {
    requestId: string;
    endpoint: string;
    method: string;
    customerId: string | null;
    msisdn: string | null;
    statusCode: number;
    requestPayload: unknown;
    responsePayload: unknown;
  }) {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO api_requests (request_id, endpoint, method, customer_id, msisdn, status_code, request_payload, response_payload, created_at)
         VALUES (@requestId, @endpoint, @method, @customerId, @msisdn, @statusCode, @requestPayload, @responsePayload, @now)`
      )
      .run({
        ...entry,
        requestPayload: safeStringify(entry.requestPayload),
        responsePayload: safeStringify(entry.responsePayload),
        now,
      });
  },
};

function safeStringify(value: unknown): string {
  try {
    // Never persist sensitive fields verbatim in logs.
    const redacted = JSON.parse(JSON.stringify(value ?? {}));
    if (redacted && typeof redacted === "object") {
      delete redacted.password;
      delete redacted.confirmPassword;
      delete redacted.client_secret;
    }
    return JSON.stringify(redacted);
  } catch {
    return "{}";
  }
}

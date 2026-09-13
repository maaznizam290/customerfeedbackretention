// Base class for domain errors that carry an HTTP status + stable error code,
// so route handlers can translate them into sanitized JSON responses without
// ever leaking stack traces or implementation details to the client.
export class AppError extends Error {
  status: number;
  code: string;
  extra?: Record<string, unknown>;

  constructor(message: string, status: number, code: string, extra?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

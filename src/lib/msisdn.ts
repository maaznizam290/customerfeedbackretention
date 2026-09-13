// Oman mobile number normalization and validation.
// Oman mobile numbers are 8 digits, typically starting with 7, 9 (also 2 for some
// fixed/mobile-converged ranges), dialed internationally as +968XXXXXXXX.

import { AppError } from "./errors";

const OMAN_COUNTRY_CODE = "968";

export class InvalidMsisdnError extends AppError {
  constructor(message = "Please enter a valid Oman mobile number.") {
    super(message, 400, "INVALID_MOBILE");
  }
}

/**
 * Normalizes a user-entered Oman mobile number into the canonical
 * "+968XXXXXXXX" form used as the internal lookup key.
 * Accepts inputs like "90000000", "0090000000" is not used in Oman, so we
 * only special-case the "+968", "968", and bare 8-digit local forms.
 */
export function normalizeOmanMsisdn(raw: string): string {
  const digitsOnly = raw.replace(/[^\d+]/g, "");
  let local: string;

  if (digitsOnly.startsWith("+968")) {
    local = digitsOnly.slice(4);
  } else if (digitsOnly.startsWith("00968")) {
    local = digitsOnly.slice(5);
  } else if (digitsOnly.startsWith("968") && digitsOnly.length === 11) {
    local = digitsOnly.slice(3);
  } else {
    local = digitsOnly.replace(/^\+/, "");
  }

  if (!/^\d{8}$/.test(local)) {
    throw new InvalidMsisdnError();
  }

  // Oman mobile ranges commonly start with 7, 9, or 2 (converged numbers).
  if (!/^[279]/.test(local)) {
    throw new InvalidMsisdnError();
  }

  return `+${OMAN_COUNTRY_CODE}${local}`;
}

export function isValidOmanMsisdn(raw: string): boolean {
  try {
    normalizeOmanMsisdn(raw);
    return true;
  } catch {
    return false;
  }
}

export function formatMsisdnForDisplay(normalized: string): string {
  // +96890000000 -> +968 9000 0000
  const match = /^\+968(\d{4})(\d{4})$/.exec(normalized);
  if (!match) return normalized;
  return `+968 ${match[1]} ${match[2]}`;
}

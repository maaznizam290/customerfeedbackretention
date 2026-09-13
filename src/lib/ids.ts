import { nextSequence } from "./db";

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function generateCustomerId(): string {
  return `CUS-OM-${pad(nextSequence("customer"), 6)}`;
}

export function generateSubscriberId(): string {
  return `ATH-SUB-${pad(nextSequence("subscriber"), 6)}`;
}

export function generateSubscriptionId(): string {
  return `SUB-OMT-${pad(nextSequence("subscription"), 6)}`;
}

export function generateRewardId(): string {
  return `RWD-${pad(nextSequence("reward"), 6)}`;
}

export function generateTransactionId(): string {
  return `TXN-${pad(nextSequence("transaction"), 6)}`;
}

export function generateRequestId(): string {
  return `REQ-${pad(nextSequence("api_request"), 6)}`;
}

export function generateEntryId(): string {
  return `LDE-${pad(nextSequence("lucky_draw_entry"), 6)}`;
}

export function generateDrawRunId(): string {
  return `LDR-${pad(nextSequence("lucky_draw_run"), 6)}`;
}

export function generateWinnerId(): string {
  return `LDW-${pad(nextSequence("lucky_draw_winner"), 6)}`;
}

export function generateSpinId(): string {
  return `SPIN-TXN-${pad(nextSequence("spin_transaction"), 6)}`;
}

export function generateEventId(): string {
  return `EVT-${pad(nextSequence("analytics_event"), 6)}`;
}

export function generateReferralCode(fullName: string): string {
  const base = fullName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "ATHX";
  return `${base}${pad(nextSequence("referral"), 4)}`;
}

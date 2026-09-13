import { MockOmantelAdapter } from "./MockOmantelAdapter";
import { OmantelProviderAdapter } from "./OmantelProviderAdapter";
import type { TelecomProviderAdapter } from "./TelecomProviderAdapter";

let cached: TelecomProviderAdapter | null = null;

export function getTelecomAdapter(): TelecomProviderAdapter {
  if (cached) return cached;
  const mode = process.env.OMANTEL_API_MODE || "mock";
  cached = mode === "production" ? new OmantelProviderAdapter() : new MockOmantelAdapter();
  return cached;
}

export type { TelecomProviderAdapter };

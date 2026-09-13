"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/apiClient";

export interface SessionSubscriber {
  subscriberId: string;
  msisdn: string;
  status: string;
}

export interface SessionData {
  authenticated: boolean;
  customerId?: string;
  fullName?: string;
  email?: string;
  referralCode?: string;
  coinBalance: number;
  subscribers: SessionSubscriber[];
}

interface SessionContextValue {
  session: SessionData;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const EMPTY_SESSION: SessionData = { authenticated: false, coinBalance: 0, subscribers: [] };

const SessionContext = createContext<SessionContextValue | null>(null);

interface MeResponse {
  authenticated: boolean;
  customer_id?: string;
  full_name?: string;
  email?: string;
  referral_code?: string;
  coin_balance?: number;
  subscribers?: { subscriber_id: string; msisdn: string; status: string }[];
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData>(EMPTY_SESSION);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<MeResponse>("/session/me", { method: "GET" });
      if (!data.authenticated) {
        setSession(EMPTY_SESSION);
        return;
      }
      setSession({
        authenticated: true,
        customerId: data.customer_id,
        fullName: data.full_name,
        email: data.email,
        referralCode: data.referral_code,
        coinBalance: data.coin_balance ?? 0,
        subscribers: (data.subscribers ?? []).map((s) => ({
          subscriberId: s.subscriber_id,
          msisdn: s.msisdn,
          status: s.status,
        })),
      });
    } catch {
      setSession(EMPTY_SESSION);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await apiFetch("/session/logout", { method: "POST" }).catch(() => undefined);
    setSession(EMPTY_SESSION);
  }, []);

  const value = useMemo(() => ({ session, loading, refresh, logout }), [session, loading, refresh, logout]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}

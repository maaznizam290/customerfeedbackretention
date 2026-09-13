"use client";

import { createContext, useContext, type ReactNode } from "react";

interface SignupModalContextValue {
  openSignup: () => void;
}

const SignupModalContext = createContext<SignupModalContextValue | null>(null);

export function SignupModalTrigger({
  openSignup,
  children,
}: {
  openSignup: () => void;
  children: ReactNode;
}) {
  return <SignupModalContext.Provider value={{ openSignup }}>{children}</SignupModalContext.Provider>;
}

export function useSignupModal(): SignupModalContextValue {
  const ctx = useContext(SignupModalContext);
  if (!ctx) throw new Error("useSignupModal must be used within SignupModalTrigger");
  return ctx;
}

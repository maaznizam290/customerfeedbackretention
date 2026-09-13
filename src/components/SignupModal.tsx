"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { apiFetch, ApiError } from "@/lib/apiClient";

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { coinsAwarded: number; balance: number; fullName: string }) => void;
}

interface SignupResponse {
  success: boolean;
  customer_id: string;
  subscriber_id: string;
  full_name: string;
  referral_code: string;
  coins_awarded: number;
  coin_balance: number;
}

const initialForm = {
  fullName: "",
  mobile: "",
  email: "",
  password: "",
  confirmPassword: "",
  referralCode: "",
};

export function SignupModal({ isOpen, onClose, onSuccess }: SignupModalProps) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof initialForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<SignupResponse>("/customers/signup", {
        method: "POST",
        body: JSON.stringify({
          fullName: form.fullName,
          mobile: form.mobile,
          email: form.email,
          password: form.password,
          confirmPassword: form.confirmPassword,
          referralCode: form.referralCode || undefined,
        }),
      });
      setForm(initialForm);
      onSuccess({ coinsAwarded: result.coins_awarded, balance: result.coin_balance, fullName: result.full_name });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setForm(initialForm);
        setError(null);
        onClose();
      }}
      title="Create your ATHARX account"
      maxWidthClassName="max-w-md"
    >
      <p className="-mt-2 mb-5 text-sm text-atharx-navy/60">Join, subscribe and earn rewards for staying connected.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Full Name" htmlFor="fullName">
          <input
            id="fullName"
            required
            minLength={2}
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="atharx-input"
            placeholder="e.g. Ahmed Al Balushi"
            autoComplete="name"
          />
        </Field>

        <Field label="Mobile Number" htmlFor="mobile" hint="Oman number, e.g. +968 9000 0000">
          <input
            id="mobile"
            required
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            className="atharx-input"
            placeholder="+968 9XXX XXXX"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>

        <Field label="Email Address" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="atharx-input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="atharx-input"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm Password" htmlFor="confirmPassword">
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              className="atharx-input"
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </Field>
        </div>

        <Field label="Referral Code (optional)" htmlFor="referralCode">
          <input
            id="referralCode"
            value={form.referralCode}
            onChange={(e) => update("referralCode", e.target.value)}
            className="atharx-input"
            placeholder="e.g. AHMD0001"
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-atharx-navy to-atharx-navy2 py-3.5 text-sm font-bold text-white shadow-card transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating your account..." : "Create Account"}
        </button>
      </form>
    </Modal>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-atharx-navy">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-atharx-navy/40">{hint}</p>}
    </div>
  );
}

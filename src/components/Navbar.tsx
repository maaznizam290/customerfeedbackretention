"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, UserCircle2, LogOut } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { CoinBadge } from "@/components/CoinBadge";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/packages", label: "Prepaid Packages" },
  { href: "/rewards", label: "Rewards" },
  { href: "/vault", label: "Vault" },
  { href: "/rewards/lucky-draw", label: "Lucky Draw" },
  { href: "/rewards/spin", label: "Spin & Win" },
];

export function Navbar({ onOpenSignup }: { onOpenSignup: () => void }) {
  const { session, loading, logout } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-atharx-navy/5 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="ATHARX home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-atharx-navy to-atharx-teal text-lg font-black text-white shadow-card">
            A
          </span>
          <span className="text-xl font-black tracking-tight text-atharx-navy">ATHARX</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                  active ? "bg-atharx-navy text-white" : "text-atharx-navy/70 hover:bg-atharx-cloud hover:text-atharx-navy"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && (
            <Link href={session.authenticated ? "/rewards" : "#"} onClick={(e) => !session.authenticated && e.preventDefault()}>
              <CoinBadge amount={session.coinBalance} size="sm" className="hidden sm:inline-flex" />
              <span className="sm:hidden inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-300">
                🪙 {session.coinBalance}
              </span>
            </Link>
          )}

          {session.authenticated ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-1 rounded-full p-1.5 text-atharx-navy hover:bg-atharx-cloud"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Account menu"
              >
                <UserCircle2 size={26} />
              </button>
              {profileOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-atharx-navy/10 bg-white p-3 shadow-xl"
                >
                  <p className="truncate px-2 py-1 text-sm font-bold text-atharx-navy">{session.fullName}</p>
                  <p className="truncate px-2 pb-2 text-xs text-atharx-navy/50">{session.email}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm font-semibold text-atharx-navy/70 hover:bg-atharx-cloud"
                  >
                    <LogOut size={16} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenSignup}
              className="rounded-full bg-atharx-navy px-4 py-2 text-sm font-bold text-white shadow-card transition hover:bg-atharx-navy2"
            >
              Create Account
            </button>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-atharx-navy lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-atharx-navy/10 bg-white px-4 py-2 lg:hidden" aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-atharx-navy/80 hover:bg-atharx-cloud"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

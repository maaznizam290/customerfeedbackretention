"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Zap,
  Megaphone,
  Ticket,
  Shuffle,
  FlaskConical,
  Gift,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { href: "/control", label: "Dashboard", icon: LayoutDashboard },
  { href: "/control/enterprises", label: "Enterprises", icon: Building2 },
  { href: "/control/customers", label: "Customers", icon: Users },
  { href: "/control/behaviours", label: "Behaviours", icon: Zap },
  { href: "/control/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/control/tokens", label: "Tokens", icon: Ticket },
  { href: "/control/rewards", label: "Rewards", icon: Gift },
  { href: "/control/selection", label: "Selection & Results", icon: Shuffle },
  { href: "/control/simulator", label: "Simulator", icon: FlaskConical },
  { href: "/control/audit", label: "Audit Logs", icon: ShieldCheck },
];

export default function ControlLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-atharx-teal to-atharx-navy text-sm font-black text-white">
            A
          </span>
          <div>
            <p className="text-sm font-black leading-none text-white">ATHARX</p>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Control Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-atharx-teal/15 text-atharx-teal2" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeftRight size={17} />
            Customer App
          </Link>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-5 py-4 lg:hidden">
          <p className="text-sm font-black text-white">ATHARX Control Panel</p>
          <Link href="/" className="text-xs font-semibold text-atharx-teal2">
            Customer App →
          </Link>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

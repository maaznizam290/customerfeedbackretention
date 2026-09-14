"use client";

import { useSession } from "@/hooks/useSession";
import { useSignupModal } from "@/hooks/useSignupModal";
import { VipProgressCard } from "@/components/VipProgressCard";
import { SpinTeaserCard } from "@/components/SpinTeaserCard";
import { LuckyDrawTeaserCard } from "@/components/LuckyDrawTeaserCard";
import { CampaignsSection } from "@/components/CampaignsSection";
import { FeaturedExperiencesSection } from "@/components/FeaturedExperiencesSection";
import { PackagesSection } from "@/components/PackagesSection";
import { RecentActivity } from "@/components/RecentActivity";

export default function HomePage() {
  const { session, loading } = useSession();
  const { openSignup } = useSignupModal();

  return (
    <main>
      <Hero authenticated={!loading && session.authenticated} fullName={session.fullName} onOpenSignup={openSignup} />

      {!loading && session.authenticated && (
        <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <VipProgressCard />
            <SpinTeaserCard />
            <LuckyDrawTeaserCard />
          </div>
        </section>
      )}

      <FeaturedExperiencesSection />
      <CampaignsSection limit={3} />
      <PackagesSection />

      {!loading && session.authenticated && (
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
          <RecentActivity />
        </section>
      )}
    </main>
  );
}

function Hero({
  authenticated,
  fullName,
  onOpenSignup,
}: {
  authenticated: boolean;
  fullName?: string;
  onOpenSignup: () => void;
}) {
  return (
    <section className="relative overflow-hidden bg-atharx-hero px-4 py-20 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        {authenticated ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-atharx-teal2">Welcome back</p>
            <h1 className="mt-3 text-4xl font-black sm:text-5xl">Welcome back, {fullName?.split(" ")[0] ?? "there"}</h1>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Keep earning Coins from campaigns, subscriptions and Spin &amp; Win — every bit brings you closer to VIP.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-widest text-atharx-teal2">Omantel Prepaid Rewards</p>
            <h1 className="mt-3 text-4xl font-black sm:text-6xl">ATHARX</h1>
            <p className="mt-2 text-xl font-bold text-white/90 sm:text-2xl">Rewards That Keep You Connected</p>
            <p className="mx-auto mt-4 max-w-xl text-white/70">Subscribe. Earn. Save. Stay with Omantel.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onOpenSignup}
                className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-atharx-navy shadow-glow transition hover:scale-[1.02]"
              >
                Create Account
              </button>
              <a
                href="#packages"
                className="rounded-full border border-white/30 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Browse Prepaid Packages
              </a>
            </div>
            <div className="mt-6 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/20">
                🪙 0 Coins to start
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

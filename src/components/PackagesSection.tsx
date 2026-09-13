"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useSession } from "@/hooks/useSession";
import { PackageCard, PackageCardSkeleton } from "@/components/PackageCard";
import { SubscribeModal, type SubscribeSuccessData } from "@/components/SubscribeModal";
import { SubscriptionSuccessModal } from "@/components/SubscriptionSuccessModal";
import { VipReachedModal } from "@/components/VipReachedModal";
import type { ApiPackage } from "@/types/api";

export function PackagesSection({ title = true }: { title?: boolean }) {
  const { refresh } = useSession();
  const [packages, setPackages] = useState<ApiPackage[] | null>(null);
  const [selected, setSelected] = useState<ApiPackage | null>(null);
  const [successData, setSuccessData] = useState<SubscribeSuccessData | null>(null);
  const [successPkg, setSuccessPkg] = useState<ApiPackage | null>(null);
  const [showVip, setShowVip] = useState(false);

  useEffect(() => {
    apiFetch<{ packages: ApiPackage[] }>("/packages/catalog", { method: "GET" })
      .then((data) => setPackages(data.packages))
      .catch(() => setPackages([]));
  }, []);

  return (
    <section id="packages" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      {title && (
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-black text-atharx-navy sm:text-4xl">Omantel Prepaid Packages</h2>
          <p className="mx-auto mt-2 max-w-xl text-atharx-navy/60">Choose your next connection plan and earn Coins.</p>
          <p className="mx-auto mt-1 max-w-xl text-xs text-atharx-navy/35">
            Demo seed pricing shown for this ATHARX prototype — not official Omantel offers.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {packages === null
          ? [...Array(3)].map((_, i) => <PackageCardSkeleton key={i} />)
          : packages.length === 0
            ? <p className="col-span-full text-center text-atharx-navy/50">No packages are currently available.</p>
            : packages.map((pkg) => <PackageCard key={pkg.package_id} pkg={pkg} onSubscribe={setSelected} />)}
      </div>

      <SubscribeModal
        pkg={selected}
        onClose={() => setSelected(null)}
        onSuccess={async (data, pkg) => {
          setSelected(null);
          setSuccessData(data);
          setSuccessPkg(pkg);
          await refresh();
          if (data.vip_just_reached) {
            setTimeout(() => setShowVip(true), 400);
          }
        }}
      />

      <SubscriptionSuccessModal
        data={successData}
        pkg={successPkg}
        onClose={() => {
          setSuccessData(null);
          setSuccessPkg(null);
        }}
      />

      <VipReachedModal isOpen={showVip} onClose={() => setShowVip(false)} />
    </section>
  );
}

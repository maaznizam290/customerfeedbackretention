import { PackagesSection } from "@/components/PackagesSection";

export const metadata = { title: "Prepaid Packages — ATHARX" };

export default function PackagesPage() {
  return (
    <main className="min-h-[60vh] pt-6">
      <PackagesSection />
    </main>
  );
}

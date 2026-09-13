import { packageRepository } from "@/repositories/packageRepository";
import type { Package } from "@/types";

export const packageService = {
  listActive(): Package[] {
    return packageRepository.listActive();
  },
  getByPackageId(packageId: string): Package | null {
    return packageRepository.findByPackageId(packageId);
  },
};

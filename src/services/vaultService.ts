import { vaultRepository } from "@/repositories/vaultRepository";
import { rewardService } from "@/services/rewardService";
import { getDb } from "@/lib/db";
import { generateVaultRedemptionId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import type { VaultOffer, VaultRedemption } from "@/types";

export class InsufficientVaultCoinsError extends AppError {
  constructor(required: number, balance: number) {
    super(`This offer needs ${required} Coins — you have ${balance}.`, 403, "INSUFFICIENT_COINS", {
      required_coins: required,
      balance,
    });
  }
}

export class VaultOfferNotFoundError extends AppError {
  constructor() {
    super("Vault offer not found or no longer active.", 404, "VAULT_OFFER_NOT_FOUND");
  }
}

export interface VaultRedeemResult {
  redemption: VaultRedemption;
  alreadyRedeemed: boolean;
  coinBalance: number;
}

/**
 * The ATHARX Vault: a standing catalog of Oman lifestyle partners
 * (restaurants, hotels/resorts, parks, and premium experiences), each
 * unlocked by spending Coins — the first place in ATHARX Coins are ever
 * spent rather than earned. Deliberately separate from the Token/Campaign
 * engine: a Vault offer isn't tied to any one behaviour, and unlocking one
 * never issues a Token — it debits the reward ledger and records a
 * one-time-per-customer redemption with a durable voucher code.
 */
export const vaultService = {
  listActive(): VaultOffer[] {
    return vaultRepository.listActive();
  },

  getRedemptionsForCustomer(customerId: string): VaultRedemption[] {
    return vaultRepository.redemptionsForCustomer(customerId);
  },

  /**
   * Unlocks an offer for a customer. Idempotent: redeeming an
   * already-unlocked offer again returns the original redemption at no
   * extra Coin cost rather than erroring or double-charging (enforced by
   * the UNIQUE(offer_id, customer_id) constraint as the concurrency
   * backstop). The balance check and the debit happen in one transaction,
   * so a customer can never be charged more Coins than they have.
   */
  redeem(customerId: string, offerId: string): VaultRedeemResult {
    const existing = vaultRepository.findRedemption(offerId, customerId);
    if (existing) {
      return { redemption: existing, alreadyRedeemed: true, coinBalance: rewardService.getBalance(customerId) };
    }

    const offer = vaultRepository.findByOfferId(offerId);
    if (!offer || offer.status !== "ACTIVE") throw new VaultOfferNotFoundError();

    const db = getDb();
    const run = db.transaction((): VaultRedeemResult => {
      // Re-check inside the transaction: two concurrent requests could both
      // have passed the pre-check above before either committed.
      const raceExisting = vaultRepository.findRedemption(offerId, customerId);
      if (raceExisting) {
        return { redemption: raceExisting, alreadyRedeemed: true, coinBalance: rewardService.getBalance(customerId) };
      }

      const balance = rewardService.getBalance(customerId);
      if (balance < offer.coinCost) throw new InsufficientVaultCoinsError(offer.coinCost, balance);

      const reward = rewardService.creditReward({
        customerId,
        rewardType: "VAULT_REDEMPTION",
        coins: -offer.coinCost,
        description: `Vault redemption — ${offer.partnerName}`,
      });

      const redemptionId = generateVaultRedemptionId();
      const redemption = vaultRepository.createRedemption({
        redemptionId,
        offerId,
        customerId,
        rewardId: reward.rewardId,
        coinsSpent: offer.coinCost,
        voucherCode: `ATHARX-${redemptionId}`,
      });
      if (!redemption) throw new VaultOfferNotFoundError();

      return { redemption, alreadyRedeemed: false, coinBalance: rewardService.getBalance(customerId) };
    });

    return run();
  },
};

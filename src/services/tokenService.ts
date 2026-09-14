import { tokenRepository } from "@/repositories/tokenRepository";
import { nextSequence } from "@/lib/db";
import type { Token } from "@/types";

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * The Token Engine. A Token is the unique, traceable record of ONE
 * qualifying behaviour event for ONE campaign — never a stand-in for the
 * Coin balance (see ASSESSMENT.md §7 for the Token vs Coin distinction).
 *
 * Format: {ENTERPRISE}-{YY}-{CAMPAIGN_CODE}-{SEQUENCE}, e.g. OMT-26-F1-000001.
 * The sequence is scoped per (enterprise, year, campaign) so it stays
 * scalable and collision-free across millions of tokens without ever
 * leaking a global counter across unrelated campaigns. Always generated
 * here, server-side — no route or component is allowed to construct a
 * token id itself.
 */
export const tokenService = {
  buildTokenId(enterpriseId: string, campaignCode: string, issuedAt: Date): string {
    const yy = String(issuedAt.getUTCFullYear()).slice(-2);
    const scopeKey = `token:${enterpriseId}:${yy}:${campaignCode}`;
    const sequence = nextSequence(scopeKey);
    return `${enterpriseId}-${yy}-${campaignCode}-${pad(sequence, 6)}`;
  },

  issueToken(input: {
    enterpriseId: string;
    campaignCode: string;
    customerId: string;
    subscriberId: string | null;
    campaignId: string;
    behaviourEventId: string | null;
    issuedAt?: Date;
  }): Token {
    const issuedAt = input.issuedAt ?? new Date();
    const tokenId = this.buildTokenId(input.enterpriseId, input.campaignCode, issuedAt);
    return tokenRepository.create({
      tokenId,
      enterpriseId: input.enterpriseId,
      customerId: input.customerId,
      subscriberId: input.subscriberId,
      campaignId: input.campaignId,
      behaviourEventId: input.behaviourEventId,
      issuedAt: issuedAt.toISOString(),
    });
  },

  getById(tokenId: string): Token | null {
    return tokenRepository.findById(tokenId);
  },

  countForCampaign(campaignId: string): number {
    return tokenRepository.countForCampaign(campaignId);
  },

  search(filters: { campaignId?: string; customerId?: string; status?: string }): Token[] {
    return tokenRepository.search(filters);
  },

  listByCustomer(customerId: string): Token[] {
    return tokenRepository.listByCustomer(customerId);
  },
};

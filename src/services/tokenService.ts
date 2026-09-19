import { tokenRepository } from "@/repositories/tokenRepository";
import { nextSequence } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { auditService } from "@/services/auditService";
import type { Token, TokenStatus } from "@/types";

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

// Exception management (spec §26): HOLD/REVIEW a suspicious token, then
// RELEASE it back to ISSUED or CANCEL it. Deliberately narrow — this is a
// manual admin action for a token that has NOT been through selection yet;
// it never touches SELECTED/FULFILLED tokens (those need a fulfilment
// workflow, out of this MVP slice's scope).
const ALLOWED_MANUAL_TRANSITIONS: Record<string, TokenStatus[]> = {
  ISSUED: ["HOLD", "CANCELLED"],
  HOLD: ["ISSUED", "CANCELLED"],
};

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

  /**
   * Manual exception-management action (spec §26): HOLD a suspicious
   * token, RELEASE it back to ISSUED, or CANCEL it. Only ISSUED/HOLD
   * tokens can be moved this way — a token already SELECTED/FULFILLED is
   * out of scope for this action. Fully audited either way.
   */
  setStatus(tokenId: string, nextStatus: TokenStatus, actor = "ADMIN", reason?: string): Token {
    const token = tokenRepository.findById(tokenId);
    if (!token) throw new AppError("Token not found.", 404, "TOKEN_NOT_FOUND");
    const allowed = ALLOWED_MANUAL_TRANSITIONS[token.status] ?? [];
    if (token.status !== nextStatus && !allowed.includes(nextStatus)) {
      throw new AppError(`Token cannot move from ${token.status} to ${nextStatus}.`, 409, "INVALID_TOKEN_TRANSITION");
    }
    tokenRepository.setStatus(tokenId, nextStatus);
    const updated = tokenRepository.findById(tokenId)!;
    const eventType =
      nextStatus === "HOLD" ? "TOKEN_HELD" : nextStatus === "CANCELLED" ? "TOKEN_CANCELLED" : "TOKEN_RELEASED";
    auditService.record({
      eventType,
      campaignId: updated.campaignId,
      customerId: updated.customerId,
      tokenId: updated.tokenId,
      actor,
      beforeValue: { status: token.status },
      afterValue: { status: updated.status, reason: reason ?? null },
    });
    return updated;
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

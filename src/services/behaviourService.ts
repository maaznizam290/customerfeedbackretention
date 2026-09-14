import { behaviourRepository } from "@/repositories/behaviourRepository";
import { generateBehaviourId } from "@/lib/ids";
import type { Behaviour, BehaviourRule } from "@/types";

/**
 * The Behaviour Engine: configurable, reusable qualifying rules (§10 of the
 * brief). A behaviour is never hard-coded into a UI component or into a
 * specific campaign — campaigns reference a behaviour by id, and the same
 * behaviour can back many campaigns over time.
 */
export const behaviourService = {
  evaluate(rule: BehaviourRule, payload: Record<string, unknown>): boolean {
    if (rule.amount_gte !== undefined) {
      const amount = typeof payload.amount === "number" ? payload.amount : Number(payload.amount);
      if (!Number.isFinite(amount) || amount < rule.amount_gte) return false;
    }
    // No further constraints configured -> the event type match alone qualifies.
    return true;
  },

  /**
   * Returns the first ACTIVE behaviour of this event_type whose rule the
   * payload satisfies. Behaviours are evaluated in creation order; the
   * qualifying-event pipeline treats "no matching behaviour" as a valid,
   * simply non-qualifying event rather than an error.
   */
  findQualifying(eventType: string, payload: Record<string, unknown>): Behaviour | null {
    const candidates = behaviourRepository.listActiveByEventType(eventType);
    return candidates.find((b) => this.evaluate(b.rule, payload)) ?? null;
  },

  create(input: { name: string; eventType: string; rule: BehaviourRule; description: string }): Behaviour {
    return behaviourRepository.create({
      behaviorId: generateBehaviourId(input.eventType),
      name: input.name,
      eventType: input.eventType,
      rule: input.rule,
      description: input.description,
    });
  },

  listAll(): Behaviour[] {
    return behaviourRepository.listAll();
  },

  getById(behaviorId: string): Behaviour | null {
    return behaviourRepository.findById(behaviorId);
  },

  setStatus(behaviorId: string, status: "ACTIVE" | "INACTIVE"): Behaviour | null {
    return behaviourRepository.setStatus(behaviorId, status);
  },
};

import { getDb } from "@/lib/db";

export const analyticsRepository = {
  record(input: {
    eventId: string;
    customerId: string | null;
    subscriberId: string | null;
    eventName: string;
    metadata: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO analytics_events (event_id, customer_id, subscriber_id, event_name, metadata, created_at)
         VALUES (@eventId, @customerId, @subscriberId, @eventName, @metadata, @now)`
      )
      .run({
        ...input,
        metadata: JSON.stringify(input.metadata ?? {}),
        now,
      });
  },
};

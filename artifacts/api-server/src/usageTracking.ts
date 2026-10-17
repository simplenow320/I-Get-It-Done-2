import { db } from "./db";
import { aiUsage, billingEvents } from "@workspace/db";

// Bookkeeping for the admin's cost and revenue reports. Both helpers swallow
// their own errors: a failed log line must never fail a user's request or a
// RevenueCat webhook (that would stall subscription status updates).

export async function recordAiUsage(row: {
  userId: string;
  provider: "openai" | "deepgram";
  model: string;
  feature: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
}): Promise<void> {
  try {
    await db.insert(aiUsage).values(row);
  } catch (error: any) {
    console.error("[usage] Failed to record AI usage:", error?.message || error);
  }
}

export async function recordBillingEvent(userId: string, event: any): Promise<void> {
  if (!event?.id) return;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  // numeric columns take strings in Drizzle, which keeps cents exact.
  const money = (v: unknown) => num(v)?.toString() ?? null;
  try {
    await db
      .insert(billingEvents)
      .values({
        eventId: String(event.id).slice(0, 255),
        userId,
        type: String(event.type).slice(0, 50),
        productId: typeof event.product_id === "string" ? event.product_id.slice(0, 255) : null,
        store: typeof event.store === "string" ? event.store.slice(0, 50) : null,
        environment: typeof event.environment === "string" ? event.environment.slice(0, 20) : null,
        periodType: typeof event.period_type === "string" ? event.period_type.slice(0, 20) : null,
        // RevenueCat's USD price: 0 for trials, negative for refunds, null if unknown.
        priceUsd: money(event.price),
        takehomePercentage: money(event.takehome_percentage),
        eventAt: num(event.event_timestamp_ms) !== null ? new Date(event.event_timestamp_ms) : null,
      })
      .onConflictDoNothing({ target: billingEvents.eventId });
  } catch (error: any) {
    console.error("[usage] Failed to record billing event:", error?.message || error);
  }
}

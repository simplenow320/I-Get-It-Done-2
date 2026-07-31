import webpush from "web-push";
import { db } from "./db";
import { webPushSubscriptions, vapidConfig } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

let vapidReady: Promise<{ publicKey: string; privateKey: string }> | null = null;

// Load the VAPID keypair from the DB, generating and persisting one on first use.
export function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (!vapidReady) {
    vapidReady = (async () => {
      const [existing] = await db.select().from(vapidConfig).limit(1);
      if (existing) return { publicKey: existing.publicKey, privateKey: existing.privateKey };

      const keys = webpush.generateVAPIDKeys();
      // ON CONFLICT guards against a concurrent first-run in another process.
      await db
        .insert(vapidConfig)
        .values({ id: 1, publicKey: keys.publicKey, privateKey: keys.privateKey })
        .onConflictDoNothing();
      const [row] = await db.select().from(vapidConfig).limit(1);
      return { publicKey: row!.publicKey, privateKey: row!.privateKey };
    })();
    vapidReady.catch(() => {
      vapidReady = null; // allow retry after transient DB failure
    });
  }
  return vapidReady;
}

async function ensureConfigured(): Promise<void> {
  const keys = await getVapidKeys();
  webpush.setVapidDetails("mailto:support@igetitdone.co", keys.publicKey, keys.privateKey);
}

export interface WebPushMessage {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// Returns the set of userIds that have at least one browser subscription.
export async function getUsersWithWebPush(userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const rows = await db
    .select({ userId: webPushSubscriptions.userId })
    .from(webPushSubscriptions)
    .where(inArray(webPushSubscriptions.userId, userIds));
  return new Set(rows.map((r) => r.userId));
}

// Fan a batch of messages out to every browser subscription of each target user.
// Expired/invalid subscriptions (HTTP 404/410) are deleted.
export async function sendWebPushNotifications(messages: WebPushMessage[]): Promise<number> {
  if (messages.length === 0) return 0;

  try {
    await ensureConfigured();
  } catch (error) {
    console.error("[WebPush] VAPID configuration failed:", error);
    return 0;
  }

  const userIds = Array.from(new Set(messages.map((m) => m.userId)));
  const subs = await db
    .select()
    .from(webPushSubscriptions)
    .where(inArray(webPushSubscriptions.userId, userIds));

  if (subs.length === 0) return 0;

  const subsByUser = new Map<string, typeof subs>();
  for (const sub of subs) {
    const list = subsByUser.get(sub.userId) || [];
    list.push(sub);
    subsByUser.set(sub.userId, list);
  }

  let sent = 0;
  const staleEndpoints: string[] = [];

  await Promise.all(
    messages.flatMap((msg) =>
      (subsByUser.get(msg.userId) || []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: msg.title, body: msg.body, data: msg.data || {} })
          );
          sent++;
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.statusCode === 410) {
            staleEndpoints.push(sub.endpoint);
          } else {
            console.error("[WebPush] Send failed:", error?.statusCode || error?.message || error);
          }
        }
      })
    )
  );

  if (staleEndpoints.length > 0) {
    try {
      await db
        .delete(webPushSubscriptions)
        .where(inArray(webPushSubscriptions.endpoint, staleEndpoints));
      console.log(`[WebPush] Removed ${staleEndpoints.length} expired subscription(s)`);
    } catch (error) {
      console.error("[WebPush] Failed to remove stale subscriptions:", error);
    }
  }

  return sent;
}

export async function saveWebPushSubscription(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  await db
    .insert(webPushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    })
    .onConflictDoUpdate({
      target: webPushSubscriptions.endpoint,
      set: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
}

export async function deleteWebPushSubscription(userId: string, endpoint: string): Promise<void> {
  await db
    .delete(webPushSubscriptions)
    .where(eq(webPushSubscriptions.endpoint, endpoint));
}

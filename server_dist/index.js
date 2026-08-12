var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  connectorKeys: () => connectorKeys,
  contacts: () => contacts,
  delegationNotes: () => delegationNotes,
  insertContactSchema: () => insertContactSchema,
  insertDelegationNoteSchema: () => insertDelegationNoteSchema,
  insertSubtaskSchema: () => insertSubtaskSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertTeamInviteSchema: () => insertTeamInviteSchema,
  insertTeamMemberSchema: () => insertTeamMemberSchema,
  insertUserSchema: () => insertUserSchema,
  insertUserStatsSchema: () => insertUserStatsSchema,
  insertVoiceUsageSchema: () => insertVoiceUsageSchema,
  oauthClients: () => oauthClients,
  oauthCodes: () => oauthCodes,
  oauthTokens: () => oauthTokens,
  selectContactSchema: () => selectContactSchema,
  selectSubtaskSchema: () => selectSubtaskSchema,
  selectTaskSchema: () => selectTaskSchema,
  selectUserSchema: () => selectUserSchema,
  subtasks: () => subtasks,
  tasks: () => tasks,
  teamInvites: () => teamInvites,
  teamMembers: () => teamMembers,
  userStats: () => userStats,
  users: () => users,
  vapidConfig: () => vapidConfig,
  voiceUsage: () => voiceUsage,
  webPushSubscriptions: () => webPushSubscriptions
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
var users, webPushSubscriptions, vapidConfig, oauthClients, oauthCodes, oauthTokens, tasks, subtasks, contacts, delegationNotes, teamInvites, teamMembers, userStats, connectorKeys, voiceUsage, insertUserSchema, selectUserSchema, insertTaskSchema, selectTaskSchema, insertSubtaskSchema, selectSubtaskSchema, insertContactSchema, selectContactSchema, insertDelegationNoteSchema, insertUserStatsSchema, insertTeamInviteSchema, insertTeamMemberSchema, insertVoiceUsageSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      email: varchar("email", { length: 255 }).unique(),
      passwordHash: varchar("password_hash", { length: 255 }),
      displayName: varchar("display_name", { length: 255 }),
      deviceId: varchar("device_id", { length: 255 }),
      pushToken: varchar("push_token", { length: 255 }),
      notificationsEnabled: boolean("notifications_enabled").default(false),
      resetToken: varchar("reset_token", { length: 6 }),
      resetTokenExpiry: timestamp("reset_token_expiry"),
      subscriptionStatus: varchar("subscription_status", { length: 50 }).default("none"),
      trialEndsAt: timestamp("trial_ends_at"),
      lifetimeTasksCreated: integer("lifetime_tasks_created").default(0),
      notificationIntensity: varchar("notification_intensity", { length: 20 }).default("standard"),
      escalatingRemindersEnabled: boolean("escalating_reminders_enabled").default(true),
      morningKickoffEnabled: boolean("morning_kickoff_enabled").default(true),
      eveningCheckinEnabled: boolean("evening_checkin_enabled").default(true),
      streakSaverEnabled: boolean("streak_saver_enabled").default(true),
      morningKickoffHour: integer("morning_kickoff_hour").default(8),
      eveningCheckinHour: integer("evening_checkin_hour").default(19),
      timezoneOffsetMinutes: integer("timezone_offset_minutes").default(0),
      lastMorningKickoffDate: varchar("last_morning_kickoff_date", { length: 10 }),
      lastEveningCheckinDate: varchar("last_evening_checkin_date", { length: 10 }),
      lastStreakSaverDate: varchar("last_streak_saver_date", { length: 10 }),
      createdAt: timestamp("created_at").defaultNow()
    });
    webPushSubscriptions = pgTable("web_push_subscriptions", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
      endpoint: text("endpoint").notNull().unique(),
      p256dh: text("p256dh").notNull(),
      auth: text("auth").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    vapidConfig = pgTable("vapid_config", {
      id: integer("id").primaryKey().default(1),
      publicKey: text("public_key").notNull(),
      privateKey: text("private_key").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    oauthClients = pgTable("oauth_clients", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      clientName: varchar("client_name", { length: 255 }),
      redirectUris: text("redirect_uris").notNull(),
      // JSON array of allowed redirect URIs
      tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 50 }).default("none"),
      createdAt: timestamp("created_at").defaultNow()
    });
    oauthCodes = pgTable("oauth_codes", {
      code: varchar("code", { length: 255 }).primaryKey(),
      clientId: varchar("client_id", { length: 255 }).notNull(),
      userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
      redirectUri: text("redirect_uri").notNull(),
      codeChallenge: varchar("code_challenge", { length: 255 }),
      codeChallengeMethod: varchar("code_challenge_method", { length: 10 }),
      expiresAt: timestamp("expires_at").notNull(),
      usedAt: timestamp("used_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    oauthTokens = pgTable("oauth_tokens", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      clientId: varchar("client_id", { length: 255 }).notNull(),
      userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
      accessTokenHash: varchar("access_token_hash", { length: 64 }).notNull().unique(),
      refreshTokenHash: varchar("refresh_token_hash", { length: 64 }).unique(),
      accessExpiresAt: timestamp("access_expires_at").notNull(),
      refreshExpiresAt: timestamp("refresh_expires_at"),
      revokedAt: timestamp("revoked_at"),
      lastUsedAt: timestamp("last_used_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    tasks = pgTable("tasks", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
      title: varchar("title", { length: 500 }).notNull(),
      notes: text("notes"),
      lane: varchar("lane", { length: 20 }).notNull().default("now"),
      reminderType: varchar("reminder_type", { length: 20 }).default("soft"),
      focusTimeMinutes: integer("focus_time_minutes").default(0),
      isOverdue: boolean("is_overdue").default(false),
      nudgeCount: integer("nudge_count").default(0),
      lastNudgeAt: timestamp("last_nudge_at"),
      createdAt: timestamp("created_at").defaultNow(),
      completedAt: timestamp("completed_at"),
      dueDate: timestamp("due_date"),
      assignedTo: varchar("assigned_to", { length: 255 }),
      delegatedToUserId: varchar("delegated_to_user_id", { length: 255 }).references(() => users.id),
      delegationStatus: varchar("delegation_status", { length: 20 }),
      delegatedAt: timestamp("delegated_at"),
      lastDelegationUpdate: timestamp("last_delegation_update")
    });
    subtasks = pgTable("subtasks", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      taskId: varchar("task_id", { length: 255 }).references(() => tasks.id, { onDelete: "cascade" }),
      title: varchar("title", { length: 500 }).notNull(),
      completed: boolean("completed").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    contacts = pgTable("contacts", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
      name: varchar("name", { length: 255 }).notNull(),
      role: varchar("role", { length: 255 }),
      color: varchar("color", { length: 20 }),
      createdAt: timestamp("created_at").defaultNow()
    });
    delegationNotes = pgTable("delegation_notes", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      taskId: varchar("task_id", { length: 255 }).references(() => tasks.id, { onDelete: "cascade" }),
      authorId: varchar("author_id", { length: 255 }).references(() => users.id),
      type: varchar("type", { length: 50 }).notNull(),
      text: text("text"),
      createdAt: timestamp("created_at").defaultNow()
    });
    teamInvites = pgTable("team_invites", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      inviteCode: varchar("invite_code", { length: 20 }).unique().notNull(),
      inviterId: varchar("inviter_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
      inviteeEmail: varchar("invitee_email", { length: 255 }),
      status: varchar("status", { length: 20 }).default("pending"),
      createdAt: timestamp("created_at").defaultNow(),
      expiresAt: timestamp("expires_at")
    });
    teamMembers = pgTable("team_members", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
      teammateId: varchar("teammate_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
      nickname: varchar("nickname", { length: 255 }),
      role: varchar("role", { length: 255 }),
      color: varchar("color", { length: 20 }),
      createdAt: timestamp("created_at").defaultNow()
    });
    userStats = pgTable("user_stats", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).unique().references(() => users.id, { onDelete: "cascade" }),
      currentStreak: integer("current_streak").default(0),
      longestStreak: integer("longest_streak").default(0),
      totalTasksCompleted: integer("total_tasks_completed").default(0),
      totalSubtasksCompleted: integer("total_subtasks_completed").default(0),
      totalFocusMinutes: integer("total_focus_minutes").default(0),
      points: integer("points").default(0),
      level: varchar("level", { length: 20 }).default("starter"),
      lastActiveDate: date("last_active_date"),
      streakProtectionUsed: boolean("streak_protection_used").default(false)
    });
    connectorKeys = pgTable("connector_keys", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).notNull().references(() => users.id, { onDelete: "cascade" }),
      keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
      keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),
      label: varchar("label", { length: 100 }),
      lastUsedAt: timestamp("last_used_at"),
      revokedAt: timestamp("revoked_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    voiceUsage = pgTable("voice_usage", {
      id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()::text`),
      userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
      date: date("date").notNull(),
      secondsUsed: integer("seconds_used").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    insertUserSchema = createInsertSchema(users);
    selectUserSchema = createSelectSchema(users);
    insertTaskSchema = createInsertSchema(tasks);
    selectTaskSchema = createSelectSchema(tasks);
    insertSubtaskSchema = createInsertSchema(subtasks);
    selectSubtaskSchema = createSelectSchema(subtasks);
    insertContactSchema = createInsertSchema(contacts);
    selectContactSchema = createSelectSchema(contacts);
    insertDelegationNoteSchema = createInsertSchema(delegationNotes);
    insertUserStatsSchema = createInsertSchema(userStats);
    insertTeamInviteSchema = createInsertSchema(teamInvites);
    insertTeamMemberSchema = createInsertSchema(teamMembers);
    insertVoiceUsageSchema = createInsertSchema(voiceUsage);
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var Pool, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4
    });
    pool.on("error", (err) => {
      console.error("Unexpected database pool error:", err.message);
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/webPush.ts
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
function getVapidKeys() {
  if (!vapidReady) {
    vapidReady = (async () => {
      const [existing] = await db.select().from(vapidConfig).limit(1);
      if (existing) return { publicKey: existing.publicKey, privateKey: existing.privateKey };
      const keys = webpush.generateVAPIDKeys();
      await db.insert(vapidConfig).values({ id: 1, publicKey: keys.publicKey, privateKey: keys.privateKey }).onConflictDoNothing();
      const [row] = await db.select().from(vapidConfig).limit(1);
      return { publicKey: row.publicKey, privateKey: row.privateKey };
    })();
    vapidReady.catch(() => {
      vapidReady = null;
    });
  }
  return vapidReady;
}
async function ensureConfigured() {
  const keys = await getVapidKeys();
  webpush.setVapidDetails("mailto:support@igetitdone.co", keys.publicKey, keys.privateKey);
}
async function getUsersWithWebPush(userIds) {
  if (userIds.length === 0) return /* @__PURE__ */ new Set();
  const rows = await db.select({ userId: webPushSubscriptions.userId }).from(webPushSubscriptions).where(inArray(webPushSubscriptions.userId, userIds));
  return new Set(rows.map((r) => r.userId));
}
async function sendWebPushNotifications(messages) {
  if (messages.length === 0) return 0;
  try {
    await ensureConfigured();
  } catch (error) {
    console.error("[WebPush] VAPID configuration failed:", error);
    return 0;
  }
  const userIds = Array.from(new Set(messages.map((m) => m.userId)));
  const subs = await db.select().from(webPushSubscriptions).where(inArray(webPushSubscriptions.userId, userIds));
  if (subs.length === 0) return 0;
  const subsByUser = /* @__PURE__ */ new Map();
  for (const sub of subs) {
    const list = subsByUser.get(sub.userId) || [];
    list.push(sub);
    subsByUser.set(sub.userId, list);
  }
  let sent = 0;
  const staleEndpoints = [];
  await Promise.all(
    messages.flatMap(
      (msg) => (subsByUser.get(msg.userId) || []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: msg.title, body: msg.body, data: msg.data || {} })
          );
          sent++;
        } catch (error) {
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
      await db.delete(webPushSubscriptions).where(inArray(webPushSubscriptions.endpoint, staleEndpoints));
      console.log(`[WebPush] Removed ${staleEndpoints.length} expired subscription(s)`);
    } catch (error) {
      console.error("[WebPush] Failed to remove stale subscriptions:", error);
    }
  }
  return sent;
}
async function saveWebPushSubscription(userId, subscription) {
  await db.insert(webPushSubscriptions).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth
  }).onConflictDoUpdate({
    target: webPushSubscriptions.endpoint,
    set: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
  });
}
async function deleteWebPushSubscription(userId, endpoint) {
  await db.delete(webPushSubscriptions).where(eq(webPushSubscriptions.endpoint, endpoint));
}
var vapidReady;
var init_webPush = __esm({
  "server/webPush.ts"() {
    "use strict";
    init_db();
    init_schema();
    vapidReady = null;
  }
});

// server/nudgeEngine.ts
var nudgeEngine_exports = {};
__export(nudgeEngine_exports, {
  sendDailyRhythmNotifications: () => sendDailyRhythmNotifications,
  sendEscalatingNudges: () => sendEscalatingNudges,
  sendStreakSaverNotifications: () => sendStreakSaverNotifications
});
import { eq as eq2, and, isNotNull, isNull, gte, lt, or } from "drizzle-orm";
async function deliverNudges(messages) {
  if (messages.length === 0) return 0;
  const expoResult = await sendBulkPushNotifications(
    messages.filter((m) => m.pushToken).map((m) => ({
      token: m.pushToken,
      title: m.title,
      body: m.body,
      data: m.data,
      categoryId: m.categoryId
    }))
  );
  const webSent = await sendWebPushNotifications(
    messages.map((m) => ({ userId: m.userId, title: m.title, body: m.body, data: m.data }))
  );
  return Math.max(expoResult.sent, 0) + webSent;
}
function normalizeIntensity(value) {
  if (value === "gentle" || value === "relentless") return value;
  return "standard";
}
function toLocal(now, tzOffsetMinutes) {
  return new Date(now.getTime() - (tzOffsetMinutes || 0) * 60 * 1e3);
}
function localDateStr(local) {
  return local.toISOString().split("T")[0];
}
function isQuietHours(local) {
  const h = local.getUTCHours();
  return h >= QUIET_HOUR_START || h < QUIET_HOUR_END;
}
function escalatingMessage(taskTitle, nudgeCount) {
  const t = taskTitle.length > 60 ? taskTitle.slice(0, 57) + "..." : taskTitle;
  if (nudgeCount === 0) {
    return { title: "Quick nudge", body: `"${t}" is still waiting. A small start counts \u2014 even 5 minutes.` };
  }
  if (nudgeCount === 1) {
    return { title: "Still on your plate", body: `"${t}" hasn't moved. Want to knock it out right now? Tap to start a focus timer.` };
  }
  if (nudgeCount === 2) {
    return { title: "Let's be real", body: `"${t}" keeps slipping. Open it and do just the first step \u2014 momentum will follow.` };
  }
  return { title: "It's not going away", body: `"${t}" \u2014 nudge #${nudgeCount + 1}. Future you will be so relieved. Start now?` };
}
async function sendEscalatingNudges() {
  if (nudgeRunInProgress) return 0;
  nudgeRunInProgress = true;
  try {
    return await runEscalatingNudges();
  } finally {
    nudgeRunInProgress = false;
  }
}
async function runEscalatingNudges() {
  const now = /* @__PURE__ */ new Date();
  const rows = await db.select({
    taskId: tasks.id,
    title: tasks.title,
    nudgeCount: tasks.nudgeCount,
    lastNudgeAt: tasks.lastNudgeAt,
    userId: tasks.userId,
    pushToken: users.pushToken,
    intensity: users.notificationIntensity,
    tz: users.timezoneOffsetMinutes
  }).from(tasks).innerJoin(users, eq2(tasks.userId, users.id)).where(
    and(
      eq2(tasks.isOverdue, true),
      isNull(tasks.completedAt),
      eq2(users.notificationsEnabled, true),
      eq2(users.escalatingRemindersEnabled, true)
    )
  ).limit(SCAN_LIMIT);
  const webUsers = await getUsersWithWebPush(
    Array.from(new Set(rows.map((r) => r.userId).filter((id) => !!id)))
  );
  const toSend = [];
  const nudgedUsers = /* @__PURE__ */ new Set();
  for (const row of rows) {
    if (!row.userId) continue;
    if (!row.pushToken && !webUsers.has(row.userId)) continue;
    const intensity = normalizeIntensity(row.intensity);
    const local = toLocal(now, row.tz);
    if (isQuietHours(local)) continue;
    const count = row.nudgeCount || 0;
    if (count >= MAX_NUDGES_PER_TASK[intensity]) continue;
    const last = row.lastNudgeAt ? row.lastNudgeAt.getTime() : 0;
    if (now.getTime() - last < NUDGE_INTERVAL_MS[intensity]) continue;
    if (nudgedUsers.has(row.userId)) continue;
    nudgedUsers.add(row.userId);
    const cutoff = new Date(now.getTime() - NUDGE_INTERVAL_MS[intensity]);
    const claimed = await db.update(tasks).set({ nudgeCount: count + 1, lastNudgeAt: now }).where(
      and(
        eq2(tasks.id, row.taskId),
        isNull(tasks.completedAt),
        or(isNull(tasks.lastNudgeAt), lt(tasks.lastNudgeAt, cutoff))
      )
    ).returning({ id: tasks.id });
    if (claimed.length === 0) continue;
    const msg = escalatingMessage(row.title, count);
    toSend.push({ taskId: row.taskId, userId: row.userId, token: row.pushToken, title: msg.title, body: msg.body, nudgeCount: count });
  }
  if (toSend.length === 0) return 0;
  return deliverNudges(
    toSend.map((n) => ({
      userId: n.userId,
      pushToken: n.token,
      title: n.title,
      body: n.body,
      data: { type: "escalating_nudge", taskId: n.taskId },
      categoryId: "task_nudge"
    }))
  );
}
async function sendDailyRhythmNotifications() {
  const now = /* @__PURE__ */ new Date();
  const candidates = await db.select().from(users).where(
    and(
      eq2(users.notificationsEnabled, true),
      or(eq2(users.morningKickoffEnabled, true), eq2(users.eveningCheckinEnabled, true))
    )
  ).limit(SCAN_LIMIT);
  const webUsers = await getUsersWithWebPush(candidates.map((c) => c.id));
  let sent = 0;
  for (const u of candidates) {
    if (!u.pushToken && !webUsers.has(u.id)) continue;
    const local = toLocal(now, u.timezoneOffsetMinutes);
    const localHour = local.getUTCHours();
    const today = localDateStr(local);
    if (u.morningKickoffEnabled && localHour === (u.morningKickoffHour ?? 8) && u.lastMorningKickoffDate !== today) {
      const open = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and(eq2(tasks.userId, u.id), isNull(tasks.completedAt)));
      if (open.length > 0) {
        const body = open.length === 1 ? `One thing on your list: "${open[0].title}". Do it early, own the day.` : `${open.length} tasks are waiting. Don't scan the list \u2014 pick ONE and start. "${open[0].title}"?`;
        sent += await deliverNudges([
          {
            userId: u.id,
            pushToken: u.pushToken,
            title: "Good morning \u2014 what's your ONE thing?",
            body,
            data: { type: "morning_kickoff" }
          }
        ]);
      }
      await db.update(users).set({ lastMorningKickoffDate: today }).where(eq2(users.id, u.id));
    }
    if (u.eveningCheckinEnabled && localHour === (u.eveningCheckinHour ?? 19) && u.lastEveningCheckinDate !== today) {
      const startOfLocalDayUtc = new Date(
        Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + (u.timezoneOffsetMinutes || 0) * 60 * 1e3
      );
      const open = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and(eq2(tasks.userId, u.id), isNull(tasks.completedAt)));
      const doneToday = await db.select({ id: tasks.id }).from(tasks).where(and(eq2(tasks.userId, u.id), isNotNull(tasks.completedAt), gte(tasks.completedAt, startOfLocalDayUtc)));
      let title;
      let body;
      if (open.length === 0) {
        title = "Clean slate!";
        body = doneToday.length > 0 ? `${doneToday.length} done today and nothing left. That's a win.` : "Nothing pending. Enjoy your evening.";
      } else {
        title = "Evening check-in";
        body = doneToday.length > 0 ? `${doneToday.length} done today \u2014 ${open.length} left. "${open[0].title}" is still doable tonight.` : `${open.length} still open. Even one small task tonight beats zero. Start with "${open[0].title}"?`;
      }
      if (open.length > 0 || doneToday.length > 0) {
        sent += await deliverNudges([
          { userId: u.id, pushToken: u.pushToken, title, body, data: { type: "evening_checkin" } }
        ]);
      }
      await db.update(users).set({ lastEveningCheckinDate: today }).where(eq2(users.id, u.id));
    }
  }
  return sent;
}
async function sendStreakSaverNotifications() {
  const now = /* @__PURE__ */ new Date();
  const rows = await db.select({
    userId: users.id,
    pushToken: users.pushToken,
    tz: users.timezoneOffsetMinutes,
    lastStreakSaverDate: users.lastStreakSaverDate,
    streakSaverEnabled: users.streakSaverEnabled,
    currentStreak: userStats.currentStreak,
    lastActiveDate: userStats.lastActiveDate
  }).from(users).innerJoin(userStats, eq2(userStats.userId, users.id)).where(
    and(
      eq2(users.notificationsEnabled, true),
      eq2(users.streakSaverEnabled, true)
    )
  ).limit(SCAN_LIMIT);
  const webUsers = await getUsersWithWebPush(rows.map((r) => r.userId));
  let sent = 0;
  for (const u of rows) {
    if (!u.pushToken && !webUsers.has(u.userId)) continue;
    if (!u.currentStreak || u.currentStreak < 2) continue;
    const local = toLocal(now, u.tz);
    if (local.getUTCHours() !== STREAK_SAVER_HOUR) continue;
    const today = localDateStr(local);
    if (u.lastStreakSaverDate === today) continue;
    if (u.lastActiveDate === today) continue;
    sent += await deliverNudges([
      {
        userId: u.userId,
        pushToken: u.pushToken,
        title: `Your ${u.currentStreak}-day streak dies at midnight`,
        body: "You're ONE task away from saving it. Pick the smallest thing on your list and go.",
        data: { type: "streak_saver", streak: u.currentStreak },
        categoryId: "task_nudge"
      }
    ]);
    await db.update(users).set({ lastStreakSaverDate: today }).where(eq2(users.id, u.userId));
  }
  return sent;
}
var NUDGE_INTERVAL_MS, MAX_NUDGES_PER_TASK, QUIET_HOUR_START, QUIET_HOUR_END, nudgeRunInProgress, SCAN_LIMIT, STREAK_SAVER_HOUR;
var init_nudgeEngine = __esm({
  "server/nudgeEngine.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_pushNotifications();
    init_webPush();
    NUDGE_INTERVAL_MS = {
      gentle: 24 * 60 * 60 * 1e3,
      // once a day
      standard: 4 * 60 * 60 * 1e3,
      // every 4 hours
      relentless: 90 * 60 * 1e3
      // every 90 minutes
    };
    MAX_NUDGES_PER_TASK = {
      gentle: 5,
      standard: 12,
      relentless: 30
    };
    QUIET_HOUR_START = 21;
    QUIET_HOUR_END = 8;
    nudgeRunInProgress = false;
    SCAN_LIMIT = 1e3;
    STREAK_SAVER_HOUR = 20;
  }
});

// server/pushNotifications.ts
import { Expo } from "expo-server-sdk";
import { eq as eq3, and as and2, isNotNull as isNotNull2, lt as lt2, isNull as isNull2 } from "drizzle-orm";
async function sendPushNotification(pushToken, title, body, data) {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.error(`Invalid Expo push token: ${pushToken}`);
    return false;
  }
  try {
    const messages = [
      {
        to: pushToken,
        sound: "default",
        title,
        body,
        data: data || {}
      }
    ];
    const tickets = await expo.sendPushNotificationsAsync(messages);
    const ticket = tickets[0];
    if (ticket.status === "error") {
      console.error(`Push notification error:`, ticket.message);
      if (ticket.details?.error === "DeviceNotRegistered") {
        await clearInvalidToken(pushToken);
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}
async function sendBulkPushNotifications(notifications) {
  const result = { sent: 0, failed: 0, errors: [] };
  const messages = notifications.filter((n) => Expo.isExpoPushToken(n.token)).map((n) => ({
    to: n.token,
    sound: "default",
    title: n.title,
    body: n.body,
    data: n.data || {},
    ...n.categoryId ? { categoryId: n.categoryId } : {}
  }));
  if (messages.length === 0) return result;
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === "ok") {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push(ticket.message || "Unknown error");
          if (ticket.details?.error === "DeviceNotRegistered") {
            const msg = chunk[i];
            await clearInvalidToken(msg.to);
          }
        }
      }
    } catch (error) {
      result.failed += chunk.length;
      result.errors.push(error.message || "Chunk send failed");
    }
  }
  return result;
}
async function clearInvalidToken(pushToken) {
  try {
    await db.update(users).set({ pushToken: null, notificationsEnabled: false }).where(eq3(users.pushToken, pushToken));
    console.log(`Cleared invalid push token: ${pushToken}`);
  } catch (error) {
    console.error("Failed to clear invalid token:", error);
  }
}
async function sendDueSoonNotifications() {
  try {
    const now = /* @__PURE__ */ new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1e3);
    const dueSoonResults = await db.select({
      userId: tasks.userId,
      taskTitle: tasks.title,
      taskId: tasks.id,
      dueDate: tasks.dueDate,
      pushToken: users.pushToken,
      notificationsEnabled: users.notificationsEnabled
    }).from(tasks).innerJoin(users, eq3(tasks.userId, users.id)).where(
      and2(
        isNull2(tasks.completedAt),
        isNotNull2(tasks.dueDate),
        lt2(tasks.dueDate, twoHoursFromNow),
        eq3(users.notificationsEnabled, true),
        eq3(tasks.isOverdue, false)
      )
    );
    const eligible = dueSoonResults.filter(
      (r) => !!r.userId && !!r.dueDate && r.dueDate > now
    );
    const webUsers = await getUsersWithWebPush(
      Array.from(new Set(eligible.map((r) => r.userId)))
    );
    const expoNotifications = [];
    const webMessages = [];
    for (const r of eligible) {
      const title = "Task Due Soon";
      const body = `"${r.taskTitle}" is due in less than 2 hours.`;
      const payload = { type: "due_soon", taskId: r.taskId, userId: r.userId };
      if (r.pushToken) {
        expoNotifications.push({ token: r.pushToken, title, body, data: payload });
      }
      if (webUsers.has(r.userId)) {
        webMessages.push({ userId: r.userId, title, body, data: payload });
      }
    }
    const result = await sendBulkPushNotifications(expoNotifications);
    result.sent += await sendWebPushNotifications(webMessages);
    return result;
  } catch (error) {
    console.error("Failed to send due-soon notifications:", error);
    return { sent: 0, failed: 0, errors: [error.message] };
  }
}
function startNotificationScheduler() {
  if (schedulerInterval) return;
  console.log("[Notifications] Scheduler started");
  schedulerInterval = setInterval(async () => {
    const now = Date.now();
    if (now - lastDueSoonCheck >= DUE_SOON_INTERVAL) {
      lastDueSoonCheck = now;
      const result = await sendDueSoonNotifications();
      if (result.sent > 0) {
        console.log(`[Notifications] Due-soon: ${result.sent} sent, ${result.failed} failed`);
      }
    }
    if (now - lastNudgeCheck >= NUDGE_INTERVAL) {
      lastNudgeCheck = now;
      try {
        const { sendEscalatingNudges: sendEscalatingNudges2, sendDailyRhythmNotifications: sendDailyRhythmNotifications2, sendStreakSaverNotifications: sendStreakSaverNotifications2 } = await Promise.resolve().then(() => (init_nudgeEngine(), nudgeEngine_exports));
        const [nudges, rhythm, streaks] = [
          await sendEscalatingNudges2(),
          await sendDailyRhythmNotifications2(),
          await sendStreakSaverNotifications2()
        ];
        if (nudges + rhythm + streaks > 0) {
          console.log(
            `[Notifications] Nudges: ${nudges} escalating, ${rhythm} daily-rhythm, ${streaks} streak-saver`
          );
        }
      } catch (e) {
        console.error("[Notifications] Nudge engine error:", e);
      }
    }
  }, 60 * 1e3);
}
var expo, schedulerInterval, lastDueSoonCheck, lastNudgeCheck, DUE_SOON_INTERVAL, NUDGE_INTERVAL;
var init_pushNotifications = __esm({
  "server/pushNotifications.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_webPush();
    expo = new Expo();
    schedulerInterval = null;
    lastDueSoonCheck = 0;
    lastNudgeCheck = 0;
    DUE_SOON_INTERVAL = 30 * 60 * 1e3;
    NUDGE_INTERVAL = 10 * 60 * 1e3;
  }
});

// server/index.ts
import express from "express";
import cookieParser from "cookie-parser";
import rateLimit2 from "express-rate-limit";

// server/routes.ts
init_db();
init_schema();
import { createServer } from "node:http";
import multer from "multer";
import * as fs from "fs";
import bcrypt2 from "bcryptjs";

// server/authMiddleware.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 32) {
    return secret;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production (min 32 characters)");
  }
  console.warn("WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET env var for production.");
  return crypto.createHash("sha256").update(process.env.REPL_ID || "dev-fallback-" + Date.now()).digest("hex");
}
var JWT_SECRET = getJwtSecret();
var JWT_EXPIRES_IN = "7d";
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookieToken = req.cookies?.authToken;
  if (cookieToken) {
    return cookieToken;
  }
  return null;
}
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = payload;
  next();
}
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

// server/routes.ts
init_webPush();
init_schema();
init_pushNotifications();

// server/taskActions.ts
init_db();
init_schema();
import { eq as eq4 } from "drizzle-orm";
async function applyCompletionStats(userId) {
  const existingStats = await db.select().from(userStats).where(eq4(userStats.userId, userId));
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (existingStats.length > 0) {
    const stats = existingStats[0];
    const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate).toISOString().split("T")[0] : null;
    let newStreak = stats.currentStreak || 0;
    if (lastActive !== today) {
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      newStreak = lastActive === yesterdayStr ? (stats.currentStreak || 0) + 1 : 1;
    }
    const newPoints = (stats.points || 0) + 10;
    const newTotalCompleted = (stats.totalTasksCompleted || 0) + 1;
    const newLongestStreak = Math.max(stats.longestStreak || 0, newStreak);
    let newLevel = "starter";
    if (newPoints >= 1e3) newLevel = "master";
    else if (newPoints >= 500) newLevel = "expert";
    else if (newPoints >= 200) newLevel = "focused";
    else if (newPoints >= 100) newLevel = "achiever";
    await db.update(userStats).set({
      points: newPoints,
      totalTasksCompleted: newTotalCompleted,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      level: newLevel,
      lastActiveDate: today
    }).where(eq4(userStats.userId, userId));
  } else {
    await db.insert(userStats).values({
      userId,
      points: 10,
      totalTasksCompleted: 1,
      currentStreak: 1,
      longestStreak: 1,
      level: "starter",
      lastActiveDate: today
    });
  }
}

// server/mcp.ts
init_db();
init_schema();
import crypto3 from "crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { and as and4, eq as eq6, isNull as isNull4, sql as sql3 } from "drizzle-orm";

// server/oauth.ts
init_db();
init_schema();
import crypto2 from "crypto";
import bcrypt from "bcryptjs";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { and as and3, eq as eq5, gt, isNull as isNull3 } from "drizzle-orm";
var ACCESS_TOKEN_PREFIX = "igat_";
var REFRESH_TOKEN_PREFIX = "igrt_";
var ACCESS_TOKEN_TTL_MS = 60 * 60 * 1e3;
var REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var AUTH_CODE_TTL_MS = 10 * 60 * 1e3;
function sha256(value) {
  return crypto2.createHash("sha256").update(value).digest("hex");
}
function randomToken(prefix) {
  return prefix + crypto2.randomBytes(32).toString("base64url");
}
function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"]?.split(",")[0] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"]?.split(",")[0] || req.headers.host;
  return `${proto}://${host}`;
}
function isAllowedRedirectUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === "https:") return true;
    if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}
async function authenticateOAuthToken(token) {
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  const rows = await db.select().from(oauthTokens).where(
    and3(
      eq5(oauthTokens.accessTokenHash, sha256(token)),
      isNull3(oauthTokens.revokedAt),
      gt(oauthTokens.accessExpiresAt, /* @__PURE__ */ new Date())
    )
  ).limit(1);
  if (rows.length === 0) return null;
  db.update(oauthTokens).set({ lastUsedAt: /* @__PURE__ */ new Date() }).where(eq5(oauthTokens.id, rows[0].id)).then(() => {
  }).catch(() => {
  });
  return rows[0].userId;
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderAuthorizePage(opts) {
  const hidden = Object.entries(opts.params).map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`).join("\n");
  const loginFields = opts.loggedInEmail ? `<p class="signed-in">Signed in as <strong>${escapeHtml(opts.loggedInEmail)}</strong></p>` : `<label>Email<input type="email" name="email" required autocomplete="email" autofocus></label>
       <label>Password<input type="password" name="password" required autocomplete="current-password"></label>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect ${escapeHtml(opts.clientName)} \u2014 I Get It Done</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #F4F2ED; color: #1F2430;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
  .card { background: #fff; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%;
          box-shadow: 0 8px 30px rgba(31,36,48,.10); }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { font-size: 14px; line-height: 1.5; color: #5A6072; margin: 0 0 16px; }
  .signed-in { background: #F0EEE8; border-radius: 8px; padding: 10px 12px; color: #1F2430; }
  label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
  input { display: block; width: 100%; margin-top: 4px; padding: 10px 12px; font-size: 15px;
          border: 1px solid #D8D4CA; border-radius: 8px; }
  ul { font-size: 14px; color: #5A6072; padding-left: 20px; margin: 0 0 20px; }
  li { margin-bottom: 4px; }
  .error { background: #FDECEC; color: #B3261E; border-radius: 8px; padding: 10px 12px; font-size: 14px; margin-bottom: 16px; }
  button { width: 100%; padding: 12px; font-size: 16px; font-weight: 600; color: #fff; background: #E8590C;
           border: none; border-radius: 10px; cursor: pointer; }
  button:hover { background: #D9480F; }
  .cancel { display: block; text-align: center; margin-top: 12px; font-size: 14px; color: #5A6072; text-decoration: none; }
</style>
</head>
<body>
  <div class="card">
    <h1>Connect ${escapeHtml(opts.clientName)}</h1>
    <p><strong>${escapeHtml(opts.clientName)}</strong> wants to manage your tasks on I Get It Done. It will be able to:</p>
    <ul>
      <li>Create and list your tasks</li>
      <li>Complete, snooze, and break down tasks</li>
      <li>See your streak and stats</li>
    </ul>
    ${opts.error ? `<div class="error">${escapeHtml(opts.error)}</div>` : ""}
    <form method="POST" action="/oauth/authorize">
      ${hidden}
      ${loginFields}
      <button type="submit">${opts.loggedInEmail ? "Allow access" : "Sign in & allow access"}</button>
    </form>
  </div>
</body>
</html>`;
}
var oauthSignInLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip ?? "")}|${email}`;
  },
  message: { error: "too_many_attempts", error_description: "Too many attempts, please try again later" }
});
var oauthTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_attempts" }
});
function registerOAuthRoutes(app2) {
  const asMetadata = (req, res) => {
    const base = getBaseUrl(req);
    res.json({
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/oauth/token`,
      registration_endpoint: `${base}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["tasks"]
    });
  };
  app2.get("/.well-known/oauth-authorization-server", asMetadata);
  app2.get("/.well-known/oauth-authorization-server/mcp", asMetadata);
  app2.get("/.well-known/openid-configuration", asMetadata);
  const prMetadata = (req, res) => {
    const base = getBaseUrl(req);
    res.json({
      resource: `${base}/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
      scopes_supported: ["tasks"]
    });
  };
  app2.get("/.well-known/oauth-protected-resource", prMetadata);
  app2.get("/.well-known/oauth-protected-resource/mcp", prMetadata);
  app2.post("/oauth/register", async (req, res) => {
    try {
      const body = req.body || {};
      const redirectUris = body.redirect_uris;
      if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string" && isAllowedRedirectUri(u))) {
        return res.status(400).json({ error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array of https (or localhost http) URLs" });
      }
      const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 255) : null;
      const [row] = await db.insert(oauthClients).values({
        clientName,
        redirectUris: JSON.stringify(redirectUris),
        tokenEndpointAuthMethod: "none"
      }).returning();
      res.status(201).json({
        client_id: row.id,
        client_name: row.clientName || void 0,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        client_id_issued_at: Math.floor((row.createdAt?.getTime() ?? Date.now()) / 1e3)
      });
    } catch (err) {
      console.error("OAuth register error:", err);
      res.status(500).json({ error: "server_error" });
    }
  });
  app2.get("/oauth/authorize", async (req, res) => {
    try {
      const q = req.query;
      const validation = await validateAuthorizeParams(q);
      if ("error" in validation) return res.status(400).send(escapeHtml(validation.error));
      const { client } = validation;
      const cookieToken = req.cookies?.authToken;
      const payload = cookieToken ? verifyToken(cookieToken) : null;
      const params = {
        client_id: q.client_id,
        redirect_uri: q.redirect_uri,
        response_type: "code",
        state: q.state || "",
        code_challenge: q.code_challenge || "",
        code_challenge_method: q.code_challenge_method || ""
      };
      res.set("Content-Type", "text/html").send(renderAuthorizePage({ clientName: client.clientName || "This app", params, loggedInEmail: payload?.email ?? null }));
    } catch (err) {
      console.error("OAuth authorize (GET) error:", err);
      res.status(500).send("Something went wrong. Please try again.");
    }
  });
  app2.post("/oauth/authorize", oauthSignInLimiter, async (req, res) => {
    try {
      const b = req.body;
      const validation = await validateAuthorizeParams(b);
      if ("error" in validation) return res.status(400).send(escapeHtml(validation.error));
      const { client } = validation;
      const params = {
        client_id: b.client_id,
        redirect_uri: b.redirect_uri,
        response_type: "code",
        state: b.state || "",
        code_challenge: b.code_challenge || "",
        code_challenge_method: b.code_challenge_method || ""
      };
      const rerender = (error, loggedInEmail = null) => res.status(401).set("Content-Type", "text/html").send(renderAuthorizePage({ clientName: client.clientName || "This app", params, loggedInEmail, error }));
      let userId = null;
      const cookieToken = req.cookies?.authToken;
      const payload = cookieToken ? verifyToken(cookieToken) : null;
      if (payload) {
        userId = payload.userId;
      } else {
        const email = (b.email || "").trim().toLowerCase();
        const password = b.password || "";
        if (!email || !password) return rerender("Please enter your email and password.");
        const [user] = await db.select().from(users).where(eq5(users.email, email)).limit(1);
        if (!user || !user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
          return rerender("Invalid email or password.");
        }
        userId = user.id;
      }
      const code = crypto2.randomBytes(32).toString("base64url");
      await db.insert(oauthCodes).values({
        code: sha256(code),
        clientId: client.id,
        userId,
        redirectUri: b.redirect_uri,
        codeChallenge: b.code_challenge || null,
        codeChallengeMethod: b.code_challenge_method || null,
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS)
      });
      const redirect = new URL(b.redirect_uri);
      redirect.searchParams.set("code", code);
      if (b.state) redirect.searchParams.set("state", b.state);
      res.redirect(302, redirect.toString());
    } catch (err) {
      console.error("OAuth authorize (POST) error:", err);
      res.status(500).send("Something went wrong. Please try again.");
    }
  });
  app2.post("/oauth/token", oauthTokenLimiter, async (req, res) => {
    try {
      const b = req.body;
      const grantType = b.grant_type;
      if (grantType === "authorization_code") {
        const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier } = b;
        if (!code || !clientId) {
          return res.status(400).json({ error: "invalid_request", error_description: "code and client_id are required" });
        }
        if (!codeVerifier) {
          return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
        }
        const [row] = await db.update(oauthCodes).set({ usedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(oauthCodes.code, sha256(code)), isNull3(oauthCodes.usedAt), gt(oauthCodes.expiresAt, /* @__PURE__ */ new Date()))).returning();
        if (!row || row.clientId !== clientId) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        if (redirectUri && redirectUri !== row.redirectUri) {
          return res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
        }
        const computed = crypto2.createHash("sha256").update(codeVerifier).digest("base64url");
        if (!row.codeChallenge || computed !== row.codeChallenge) {
          return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
        }
        return res.json(await issueTokens(row.clientId, row.userId));
      }
      if (grantType === "refresh_token") {
        const refreshToken = b.refresh_token;
        if (!refreshToken || !refreshToken.startsWith(REFRESH_TOKEN_PREFIX)) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        const [row] = await db.select().from(oauthTokens).where(and3(eq5(oauthTokens.refreshTokenHash, sha256(refreshToken)), isNull3(oauthTokens.revokedAt))).limit(1);
        if (!row || !row.refreshExpiresAt || row.refreshExpiresAt < /* @__PURE__ */ new Date()) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        if (b.client_id && b.client_id !== row.clientId) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        const [revoked] = await db.update(oauthTokens).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and3(eq5(oauthTokens.id, row.id), isNull3(oauthTokens.revokedAt))).returning();
        if (!revoked) return res.status(400).json({ error: "invalid_grant" });
        return res.json(await issueTokens(row.clientId, row.userId));
      }
      return res.status(400).json({ error: "unsupported_grant_type" });
    } catch (err) {
      console.error("OAuth token error:", err);
      res.status(500).json({ error: "server_error" });
    }
  });
}
async function issueTokens(clientId, userId) {
  const accessToken = randomToken(ACCESS_TOKEN_PREFIX);
  const refreshToken = randomToken(REFRESH_TOKEN_PREFIX);
  const now = Date.now();
  await db.insert(oauthTokens).values({
    clientId,
    userId,
    accessTokenHash: sha256(accessToken),
    refreshTokenHash: sha256(refreshToken),
    accessExpiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS)
  });
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1e3),
    refresh_token: refreshToken,
    scope: "tasks"
  };
}
async function validateAuthorizeParams(p) {
  if (!p.client_id) return { error: "Missing client_id" };
  if (p.response_type && p.response_type !== "code") return { error: "Only response_type=code is supported" };
  const [client] = await db.select().from(oauthClients).where(eq5(oauthClients.id, p.client_id)).limit(1);
  if (!client) return { error: "Unknown client" };
  let allowed = [];
  try {
    allowed = JSON.parse(client.redirectUris);
  } catch {
  }
  if (!p.redirect_uri || !allowed.includes(p.redirect_uri)) return { error: "Invalid redirect_uri" };
  if (!p.code_challenge) return { error: "code_challenge is required (PKCE S256)" };
  if (p.code_challenge_method !== "S256") return { error: "Only S256 code_challenge_method is supported" };
  return { client };
}

// server/mcp.ts
var KEY_PREFIX = "igid_";
function hashKey(key) {
  return crypto3.createHash("sha256").update(key).digest("hex");
}
function generateKey() {
  return KEY_PREFIX + crypto3.randomBytes(24).toString("base64url");
}
async function authenticateConnectorRequest(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const key = header.substring(7).trim();
  if (!key.startsWith(KEY_PREFIX)) return authenticateOAuthToken(key);
  const rows = await db.select().from(connectorKeys).where(and4(eq6(connectorKeys.keyHash, hashKey(key)), isNull4(connectorKeys.revokedAt))).limit(1);
  if (rows.length === 0) return null;
  db.update(connectorKeys).set({ lastUsedAt: /* @__PURE__ */ new Date() }).where(eq6(connectorKeys.id, rows[0].id)).then(() => {
  }).catch(() => {
  });
  return rows[0].userId;
}
function registerConnectorKeyRoutes(app2) {
  app2.get("/api/connector-keys", requireAuth, async (req, res) => {
    try {
      const rows = await db.select({
        id: connectorKeys.id,
        keyPrefix: connectorKeys.keyPrefix,
        label: connectorKeys.label,
        lastUsedAt: connectorKeys.lastUsedAt,
        revokedAt: connectorKeys.revokedAt,
        createdAt: connectorKeys.createdAt
      }).from(connectorKeys).where(and4(eq6(connectorKeys.userId, req.user.userId), isNull4(connectorKeys.revokedAt)));
      res.json({ keys: rows });
    } catch (err) {
      console.error("List connector keys error:", err);
      res.status(500).json({ error: "Failed to list connector keys" });
    }
  });
  app2.post("/api/connector-keys", requireAuth, async (req, res) => {
    try {
      const label = typeof req.body?.label === "string" ? req.body.label.slice(0, 100) : null;
      const key = generateKey();
      const [row] = await db.insert(connectorKeys).values({
        userId: req.user.userId,
        keyHash: hashKey(key),
        keyPrefix: key.slice(0, 10),
        label
      }).returning({ id: connectorKeys.id, createdAt: connectorKeys.createdAt });
      res.json({ id: row.id, key, createdAt: row.createdAt });
    } catch (err) {
      console.error("Create connector key error:", err);
      res.status(500).json({ error: "Failed to create connector key" });
    }
  });
  app2.delete("/api/connector-keys/:id", requireAuth, async (req, res) => {
    try {
      const result = await db.update(connectorKeys).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and4(eq6(connectorKeys.id, req.params.id), eq6(connectorKeys.userId, req.user.userId), isNull4(connectorKeys.revokedAt))).returning({ id: connectorKeys.id });
      if (result.length === 0) return res.status(404).json({ error: "Key not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("Revoke connector key error:", err);
      res.status(500).json({ error: "Failed to revoke connector key" });
    }
  });
}
var VALID_LANES = ["now", "soon", "later", "park"];
function taskSummary(t) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    lane: t.lane,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: !!t.isOverdue,
    completed: !!t.completedAt,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null
  };
}
function textResult(payload) {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}
function errorResult(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}
async function findOwnTask(userId, taskId) {
  const rows = await db.select().from(tasks).where(and4(eq6(tasks.id, taskId), eq6(tasks.userId, userId))).limit(1);
  return rows[0] ?? null;
}
function buildMcpServer(userId) {
  const server = new McpServer({ name: "i-get-it-done", version: "1.0.0" });
  server.tool(
    "create_task",
    "Create a new task on the user's list. Lane controls urgency: 'now' (do today), 'soon' (this week), 'later' (someday), 'park' (on hold).",
    {
      title: z.string().min(1).max(500).describe("Short task title, like a to-do list line"),
      notes: z.string().max(2e3).optional().describe("Optional extra details"),
      lane: z.enum(VALID_LANES).optional().describe("Urgency lane; defaults to 'now'"),
      dueDate: z.string().optional().describe("Optional due date/time in ISO 8601 format")
    },
    async ({ title, notes, lane, dueDate }) => {
      let due = null;
      if (dueDate) {
        due = new Date(dueDate);
        if (isNaN(due.getTime())) return errorResult("Invalid dueDate \u2014 use ISO 8601, e.g. 2026-08-05T17:00:00Z");
      }
      const [task] = await db.insert(tasks).values({ userId, title, notes: notes || null, lane: lane || "now", dueDate: due }).returning();
      await db.update(users).set({ lifetimeTasksCreated: sql3`COALESCE(${users.lifetimeTasksCreated}, 0) + 1` }).where(eq6(users.id, userId));
      return textResult({ created: taskSummary(task) });
    }
  );
  server.tool(
    "list_tasks",
    "List the user's tasks. By default returns open (incomplete) tasks. Filter by lane or overdue status.",
    {
      lane: z.enum(VALID_LANES).optional().describe("Only tasks in this lane"),
      overdueOnly: z.boolean().optional().describe("Only overdue tasks"),
      includeCompleted: z.boolean().optional().describe("Include completed tasks (default false)")
    },
    async ({ lane, overdueOnly, includeCompleted }) => {
      const conditions = [eq6(tasks.userId, userId)];
      if (!includeCompleted) conditions.push(isNull4(tasks.completedAt));
      if (lane) conditions.push(eq6(tasks.lane, lane));
      if (overdueOnly) conditions.push(eq6(tasks.isOverdue, true));
      const rows = await db.select().from(tasks).where(and4(...conditions)).limit(200);
      return textResult({ count: rows.length, tasks: rows.map(taskSummary) });
    }
  );
  server.tool(
    "complete_task",
    "Mark a task as done. Counts toward the user's streak and points, exactly like completing it in the app.",
    { taskId: z.string().describe("ID of the task to complete (from list_tasks)") },
    async ({ taskId }) => {
      const task = await findOwnTask(userId, taskId);
      if (!task) return errorResult("Task not found");
      if (task.completedAt) return textResult({ alreadyCompleted: true, task: taskSummary(task) });
      const [updated] = await db.update(tasks).set({ completedAt: /* @__PURE__ */ new Date() }).where(and4(eq6(tasks.id, taskId), eq6(tasks.userId, userId))).returning();
      await applyCompletionStats(userId);
      return textResult({ completed: taskSummary(updated) });
    }
  );
  server.tool(
    "snooze_task",
    "Snooze a task's reminders for a number of hours (default 1) so the nudge engine stays quiet about it.",
    {
      taskId: z.string().describe("ID of the task to snooze"),
      hours: z.number().min(1).max(72).optional().describe("How many hours to snooze (1-72, default 1)")
    },
    async ({ taskId, hours }) => {
      const task = await findOwnTask(userId, taskId);
      if (!task) return errorResult("Task not found");
      const until = new Date(Date.now() + (hours ?? 1) * 60 * 60 * 1e3);
      await db.update(tasks).set({ lastNudgeAt: until }).where(eq6(tasks.id, taskId));
      return textResult({ snoozed: true, taskId, remindersQuietUntil: until.toISOString() });
    }
  );
  server.tool(
    "add_subtasks",
    "Break a task into smaller steps by adding subtasks to it. Great for making a big task feel doable.",
    {
      taskId: z.string().describe("ID of the parent task"),
      subtasks: z.array(z.string().min(1).max(500)).min(1).max(20).describe("Titles of the subtasks to add, in order")
    },
    async ({ taskId, subtasks: titles }) => {
      const task = await findOwnTask(userId, taskId);
      if (!task) return errorResult("Task not found");
      const rows = await db.insert(subtasks).values(titles.map((title) => ({ taskId, title }))).returning();
      return textResult({
        task: task.title,
        added: rows.map((s) => ({ id: s.id, title: s.title }))
      });
    }
  );
  server.tool(
    "get_stats",
    "Get the user's productivity stats: current streak, longest streak, points, level, and totals.",
    {},
    async () => {
      const [stats] = await db.select().from(userStats).where(eq6(userStats.userId, userId)).limit(1);
      const [openCount] = await db.select({ n: sql3`count(*)::int` }).from(tasks).where(and4(eq6(tasks.userId, userId), isNull4(tasks.completedAt)));
      const [overdueCount] = await db.select({ n: sql3`count(*)::int` }).from(tasks).where(and4(eq6(tasks.userId, userId), isNull4(tasks.completedAt), eq6(tasks.isOverdue, true)));
      return textResult({
        currentStreak: stats?.currentStreak ?? 0,
        longestStreak: stats?.longestStreak ?? 0,
        points: stats?.points ?? 0,
        level: stats?.level ?? "starter",
        totalTasksCompleted: stats?.totalTasksCompleted ?? 0,
        totalFocusMinutes: stats?.totalFocusMinutes ?? 0,
        openTasks: openCount?.n ?? 0,
        overdueTasks: overdueCount?.n ?? 0
      });
    }
  );
  return server;
}
function registerMcpRoutes(app2) {
  app2.post("/mcp", async (req, res) => {
    let userId = null;
    try {
      userId = await authenticateConnectorRequest(req);
    } catch (err) {
      console.error("MCP auth error:", err);
    }
    if (!userId) {
      const proto = req.headers["x-forwarded-proto"]?.split(",")[0] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"]?.split(",")[0] || req.headers.host;
      res.set(
        "WWW-Authenticate",
        `Bearer resource_metadata="${proto}://${host}/.well-known/oauth-protected-resource"`
      );
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: sign in via OAuth or provide a valid connector key as a Bearer token" },
        id: null
      });
    }
    const server = buildMcpServer(userId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: void 0 });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error("MCP request error:", err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null
        });
      }
    }
  });
  const methodNotAllowed = (_req, res) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32e3, message: "Method not allowed" },
      id: null
    });
  };
  app2.get("/mcp", methodNotAllowed);
  app2.delete("/mcp", methodNotAllowed);
}

// server/routes.ts
import { eq as eq7, and as and5, inArray as inArray2, or as or2, sql as sql4, isNull as isNull5 } from "drizzle-orm";
var DAILY_VOICE_LIMIT_SECONDS = 600;
var upload = multer({
  dest: "/tmp/audio-uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }
});
async function registerRoutes(app2) {
  registerOAuthRoutes(app2);
  registerMcpRoutes(app2);
  registerConnectorKeyRoutes(app2);
  app2.get("/api/debug/voice-check", async (req, res) => {
    const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    res.json({
      deepgram: hasDeepgram ? "configured" : "MISSING",
      openai: hasOpenAI ? "configured" : "MISSING",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/voice-usage/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const existing = await db.select().from(voiceUsage).where(and5(eq7(voiceUsage.userId, userId), eq7(voiceUsage.date, today))).limit(1);
      const secondsUsed = existing.length > 0 ? existing[0].secondsUsed || 0 : 0;
      const secondsRemaining = Math.max(0, DAILY_VOICE_LIMIT_SECONDS - secondsUsed);
      res.json({
        secondsUsed,
        secondsRemaining,
        dailyLimitSeconds: DAILY_VOICE_LIMIT_SECONDS,
        limitReached: secondsRemaining === 0
      });
    } catch (error) {
      console.error("Voice usage error:", error);
      res.status(500).json({ error: "Failed to get voice usage" });
    }
  });
  app2.post("/api/transcribe", requireAuth, upload.single("audio"), async (req, res) => {
    try {
      console.log("[VOICE] === New transcription request ===");
      console.log("[VOICE] File received:", req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : "NO FILE");
      console.log("[VOICE] Body params:", { userId: req.body.userId, durationSeconds: req.body.durationSeconds });
      if (!req.file) {
        console.error("[VOICE] ERROR: No audio file in request");
        return res.status(400).json({ error: "No audio file provided" });
      }
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const durationSeconds = parseInt(req.body.durationSeconds) || 0;
      if (durationSeconds > 0) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const existing = await db.select().from(voiceUsage).where(and5(eq7(voiceUsage.userId, userId), eq7(voiceUsage.date, today))).limit(1);
        const currentUsage = existing.length > 0 ? existing[0].secondsUsed || 0 : 0;
        const secondsRemaining = DAILY_VOICE_LIMIT_SECONDS - currentUsage;
        if (currentUsage + durationSeconds > DAILY_VOICE_LIMIT_SECONDS) {
          if (req.file?.path) {
            fs.unlink(req.file.path, () => {
            });
          }
          return res.status(429).json({
            error: secondsRemaining <= 0 ? "Daily voice limit reached" : `Recording would exceed daily limit. You have ${Math.floor(secondsRemaining / 60)} min ${secondsRemaining % 60} sec remaining.`,
            limitReached: secondsRemaining <= 0,
            secondsUsed: currentUsage,
            secondsRemaining,
            dailyLimitSeconds: DAILY_VOICE_LIMIT_SECONDS
          });
        }
      }
      const apiKey = process.env.DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error("DEEPGRAM_API_KEY not configured");
        return res.status(500).json({ error: "Transcription service not configured" });
      }
      const audioFilePath = req.file.path;
      const audioBuffer = fs.readFileSync(audioFilePath);
      console.log("[VOICE] Sending audio to Deepgram, size:", audioBuffer.length, "bytes, mimetype:", req.file.mimetype);
      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true", {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "audio/mp4"
        },
        body: audioBuffer
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram error:", response.status, errorText);
        throw new Error(`Deepgram API error: ${response.status}`);
      }
      const result = await response.json();
      console.log("Deepgram response:", JSON.stringify(result, null, 2));
      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
      const audioDuration = result.metadata?.duration || 0;
      console.log("[VOICE] Result - Transcript:", JSON.stringify(transcript), "Confidence:", confidence, "Duration:", audioDuration, "FileSize:", audioBuffer.length);
      if (durationSeconds > 0) {
        const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const existing = await db.select().from(voiceUsage).where(and5(eq7(voiceUsage.userId, userId), eq7(voiceUsage.date, today))).limit(1);
        if (existing.length > 0) {
          await db.update(voiceUsage).set({
            secondsUsed: (existing[0].secondsUsed || 0) + durationSeconds,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq7(voiceUsage.id, existing[0].id));
        } else {
          await db.insert(voiceUsage).values({
            userId,
            date: today,
            secondsUsed: durationSeconds
          });
        }
      }
      res.json({
        text: transcript,
        debug: { audioDuration, fileSize: audioBuffer.length, confidence }
      });
    } catch (error) {
      console.error("[VOICE] ERROR:", error?.message || error);
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {
        });
      }
      if (error.message?.includes("401")) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      res.status(500).json({ error: "Transcription failed: " + (error?.message || "Unknown error") });
    }
  });
  app2.post("/api/tasks/extract", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { transcript } = req.body;
      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }
      if (transcript.trim().length === 0) {
        return res.json({ tasks: [] });
      }
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OPENAI_API_KEY not configured");
        return res.status(500).json({ error: "AI service not configured" });
      }
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Extract FUTURE to-do tasks only. Ignore everything else.

A TO-DO TASK is something the user NEEDS TO DO LATER - NOT what they're doing right now.

EXTRACT (future actions):
- "I need to call mom" \u2192 Call mom
- "Pick up groceries" \u2192 Pick up groceries  
- "Email the landlord about the lease" \u2192 Email landlord about lease
- "Schedule a dentist appointment" \u2192 Schedule dentist appointment

IGNORE (not tasks):
- Narration about recording: "I'm going to test", "let me try", "I'm recording"
- What they're doing now: "I'm going to say some things", "I'll talk about"
- Meta-commentary: "ok so", "anyway", "let's see", "alright"
- Random speech: "since Dawn is up", "I can still talk"
- Observations: "it's cold", "that's interesting"
- Uncertainty: "maybe", "not sure", "I might"

Key test: Would this go on a paper to-do list? If no, ignore it.

Return JSON only: {"tasks": [{"title": "Task"}]}

Examples:
"So since Dawn is still up I can still talk and I'm going to test the microphone" \u2192 {"tasks": []}
"I need to pick up Chinese food and call my mom" \u2192 {"tasks": [{"title": "Pick up Chinese food"}, {"title": "Call mom"}]}
"Ok I'm gonna say a few random things then try to add a new user" \u2192 {"tasks": []}
"Remind me to buy milk and schedule car service" \u2192 {"tasks": [{"title": "Buy milk"}, {"title": "Schedule car service"}]}`
            },
            {
              role: "user",
              content: transcript
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" }
        })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (!content) {
        return res.json({ tasks: [] });
      }
      try {
        const parsed = JSON.parse(content);
        const tasks2 = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        res.json({ tasks: tasks2.filter((t) => t.title && typeof t.title === "string") });
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        res.json({ tasks: [] });
      }
    } catch (error) {
      console.error("Task extraction error:", error);
      res.status(500).json({ error: "Failed to extract tasks" });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, referralCode, referralSourceUrl } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: "Password must include at least one uppercase letter" });
      }
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({ error: "Password must include at least one lowercase letter" });
      }
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: "Password must include at least one number" });
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        return res.status(400).json({ error: "Password must include at least one special character" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await db.select().from(users).where(eq7(users.email, normalizedEmail)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      const passwordHash = await bcrypt2.hash(password, 10);
      const result = await db.insert(users).values({
        email: normalizedEmail,
        passwordHash
      }).returning();
      const user = result[0];
      await db.insert(userStats).values({
        userId: user.id
      });
      const token = generateToken({ userId: user.id, email: normalizedEmail });
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      fetch("https://prime-task-control.replit.app/api/webhooks/igetitdone-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.PRIME_WEBHOOK_SECRET}`
        },
        body: JSON.stringify({
          name: null,
          email: normalizedEmail,
          phone: null,
          variant: "ios",
          externalUserId: user.id
        })
      }).catch((e) => console.error("PRIME webhook failed:", e));
      if (typeof referralCode === "string" && referralCode.trim().length > 0) {
        const sendReferral = async (attempt) => {
          try {
            const response = await fetch("https://ambassador-plus.replit.app/api/track/referral", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                appSlug: "i-get-it-done-",
                referralCode: referralCode.trim(),
                referredUserId: user.id,
                sourceUrl: typeof referralSourceUrl === "string" && referralSourceUrl.length > 0 ? referralSourceUrl : void 0
              })
            });
            if (response.status === 201) {
              console.log(`Ambassador referral recorded for user ${user.id} (code: ${referralCode.trim()})`);
            } else if (response.status === 400) {
              console.log(`Ambassador referral code unknown, skipped: ${referralCode.trim()}`);
            } else {
              console.error(`Ambassador referral unexpected status ${response.status} for user ${user.id}`);
            }
          } catch (err) {
            if (attempt < 1) {
              await sendReferral(attempt + 1);
            } else {
              console.error("Ambassador referral network error (after retry):", err);
            }
          }
        };
        sendReferral(0).catch(() => {
        });
      }
      res.json({
        user: {
          id: user.id,
          email: normalizedEmail,
          createdAt: user.createdAt
        },
        token
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await db.select().from(users).where(eq7(users.email, normalizedEmail)).limit(1);
      if (existing.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const user = existing[0];
      if (!user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const validPassword = await bcrypt2.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateToken({ userId: user.id, email: normalizedEmail });
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      res.json({
        user: {
          id: user.id,
          email: normalizedEmail,
          createdAt: user.createdAt
        },
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.clearCookie("authToken");
    res.json({ success: true });
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const existing = await db.select().from(users).where(eq7(users.id, req.user.userId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = existing[0];
      res.json({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });
  app2.post("/api/auth/change-password", async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters" });
      }
      const existing = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      if (existing.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = existing[0];
      if (!user.passwordHash) {
        return res.status(400).json({ error: "Cannot change password for this account" });
      }
      const validPassword = await bcrypt2.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      const newPasswordHash = await bcrypt2.hash(newPassword, 10);
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq7(users.id, userId));
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
  app2.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const existing = await db.select().from(users).where(eq7(users.email, normalizedEmail)).limit(1);
      if (existing.length === 0) {
        return res.json({ success: true, message: "If an account exists with this email, you will receive a reset code" });
      }
      const user = existing[0];
      const resetCode = Math.floor(1e5 + Math.random() * 9e5).toString();
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1e3);
      await db.update(users).set({
        resetToken: resetCode,
        resetTokenExpiry: resetExpiry
      }).where(eq7(users.id, user.id));
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("SENDGRID_API_KEY not configured");
        return res.status(500).json({ error: "Email service not configured" });
      }
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: normalizedEmail }]
            }
          ],
          from: { email: "info@simplenow.co", name: "I Get It Done" },
          subject: "I Get It Done - Password Reset Code",
          content: [
            {
              type: "text/plain",
              value: `Your password reset code is: ${resetCode}

This code expires in 15 minutes.

If you did not request this reset, please ignore this email.`
            },
            {
              type: "text/html",
              value: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FF3B30;">Password Reset Code</h2>
                <p>Your password reset code is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">${resetCode}</p>
                <p style="color: #666;">This code expires in 15 minutes.</p>
                <p style="color: #999; font-size: 12px;">If you did not request this reset, please ignore this email.</p>
              </div>`
            }
          ]
        })
      });
      if (response.status !== 202 && !response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error:", response.status, errorText);
        return res.status(500).json({ error: "Failed to send reset email" });
      }
      res.json({ success: true, message: "Reset code sent to your email" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });
  app2.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedCode = code.toString().trim();
      console.log("Reset password attempt:", { email: normalizedEmail, codeProvided: normalizedCode });
      const existing = await db.select().from(users).where(eq7(users.email, normalizedEmail)).limit(1);
      if (existing.length === 0) {
        console.log("Reset password: User not found for email:", normalizedEmail);
        return res.status(400).json({ error: "Invalid reset code" });
      }
      const user = existing[0];
      console.log("Reset password: DB token:", user.resetToken, "Provided:", normalizedCode, "Match:", user.resetToken === normalizedCode);
      if (!user.resetToken || user.resetToken !== normalizedCode) {
        return res.status(400).json({ error: "Invalid reset code" });
      }
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < /* @__PURE__ */ new Date()) {
        console.log("Reset password: Token expired. Expiry:", user.resetTokenExpiry, "Now:", /* @__PURE__ */ new Date());
        return res.status(400).json({ error: "Reset code has expired. Please request a new code." });
      }
      const newPasswordHash = await bcrypt2.hash(newPassword, 10);
      await db.update(users).set({
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiry: null
      }).where(eq7(users.id, user.id));
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app2.post("/api/support/contact", async (req, res) => {
    try {
      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ error: "Name, email, and message are required" });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("SENDGRID_API_KEY not configured");
        return res.status(500).json({ error: "Email service not configured" });
      }
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: "info@simplenow.co" }]
            }
          ],
          from: { email: "info@simplenow.co", name: "I Get It Done Support" },
          reply_to: { email, name },
          subject: `Support Request from ${name}`,
          content: [
            {
              type: "text/plain",
              value: `Name: ${name}
Email: ${email}

Message:
${message}`
            },
            {
              type: "text/html",
              value: `<h2>Support Request</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><hr><p><strong>Message:</strong></p><p>${message.replace(/\n/g, "<br>")}</p>`
            }
          ]
        })
      });
      if (response.status !== 202 && !response.ok) {
        const errorText = await response.text();
        console.error("SendGrid error:", response.status, errorText);
        return res.status(500).json({ error: "Failed to send message" });
      }
      res.json({ success: true, message: "Message sent successfully" });
    } catch (error) {
      console.error("Support contact error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  app2.post("/api/users/init", async (req, res) => {
    try {
      const { deviceId } = req.body;
      let user = null;
      if (deviceId) {
        const existing = await db.select().from(users).where(eq7(users.deviceId, deviceId)).limit(1);
        if (existing.length > 0) {
          user = existing[0];
        }
      }
      if (!user) {
        const result = await db.insert(users).values({
          deviceId: deviceId || null,
          email: null
        }).returning();
        user = result[0];
        await db.insert(userStats).values({
          userId: user.id
        });
      }
      res.json({ user });
    } catch (error) {
      console.error("User init error:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });
  app2.get("/api/tasks/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const userTasks = await db.select().from(tasks).where(eq7(tasks.userId, userId));
      const taskIds = userTasks.map((t) => t.id);
      let taskSubtasks = [];
      let taskNotes = [];
      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray2(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray2(delegationNotes.taskId, taskIds));
      }
      const tasksWithDetails = userTasks.map((task) => ({
        ...task,
        subtasks: taskSubtasks.filter((st) => st.taskId === task.id),
        delegationNotes: taskNotes.filter((n) => n.taskId === task.id)
      }));
      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });
  app2.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const { id, userId, title, notes, lane, reminderType, dueDate, assignedTo } = req.body;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const userRecord = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      const subscriptionStatus = userRecord[0]?.subscriptionStatus || "none";
      const trialEndsAt = userRecord[0]?.trialEndsAt;
      const isTrialing = subscriptionStatus === "trialing" && trialEndsAt && new Date(trialEndsAt) > /* @__PURE__ */ new Date();
      const isPro = subscriptionStatus === "active" || subscriptionStatus === "pro" || isTrialing;
      const taskValues = {
        userId,
        title,
        notes: notes || null,
        lane: lane || "now",
        reminderType: reminderType || "soft",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null
      };
      if (id) {
        taskValues.id = id;
      }
      const result = await db.insert(tasks).values(taskValues).returning();
      await db.update(users).set({ lifetimeTasksCreated: sql4`COALESCE(${users.lifetimeTasksCreated}, 0) + 1` }).where(eq7(users.id, userId));
      res.json({ task: { ...result[0], subtasks: [], delegationNotes: [] } });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });
  app2.put("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const existingTask = await db.select().from(tasks).where(eq7(tasks.id, id));
      if (existingTask.length > 0 && existingTask[0].userId !== req.user?.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const wasCompleted = existingTask.length > 0 && existingTask[0].completedAt !== null;
      const isBeingCompleted = updates.completedAt && !wasCompleted;
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
      if (updates.completedAt) updates.completedAt = new Date(updates.completedAt);
      if (updates.delegatedAt) updates.delegatedAt = new Date(updates.delegatedAt);
      if (updates.lastDelegationUpdate) updates.lastDelegationUpdate = new Date(updates.lastDelegationUpdate);
      delete updates.subtasks;
      delete updates.delegationNotes;
      delete updates.createdAt;
      const result = await db.update(tasks).set(updates).where(eq7(tasks.id, id)).returning();
      if (result.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (isBeingCompleted && existingTask[0].userId) {
        await applyCompletionStats(existingTask[0].userId);
      }
      res.json({ task: result[0] });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });
  app2.post("/api/tasks/:id/snooze", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingTask = await db.select().from(tasks).where(eq7(tasks.id, id));
      if (existingTask.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (existingTask[0].userId !== req.user?.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const snoozedUntilBase = new Date(Date.now() + 60 * 60 * 1e3);
      const result = await db.update(tasks).set({ lastNudgeAt: snoozedUntilBase }).where(eq7(tasks.id, id)).returning();
      res.json(result[0]);
    } catch (error) {
      console.error("Snooze task error:", error);
      res.status(500).json({ error: "Failed to snooze task" });
    }
  });
  app2.delete("/api/tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const existingTask = await db.select().from(tasks).where(eq7(tasks.id, id)).limit(1);
      if (existingTask.length > 0 && existingTask[0].userId !== req.user?.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await db.delete(tasks).where(eq7(tasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });
  app2.post("/api/subtasks", async (req, res) => {
    try {
      const { id, taskId, title } = req.body;
      const subtaskValues = {
        taskId,
        title,
        completed: false
      };
      if (id) {
        subtaskValues.id = id;
      }
      const result = await db.insert(subtasks).values(subtaskValues).returning();
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Create subtask error:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });
  app2.put("/api/subtasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { completed, title } = req.body;
      const updates = {};
      if (completed !== void 0) updates.completed = completed;
      if (title !== void 0) updates.title = title;
      const result = await db.update(subtasks).set(updates).where(eq7(subtasks.id, id)).returning();
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });
  app2.delete("/api/subtasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(subtasks).where(eq7(subtasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });
  app2.get("/api/contacts/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const userContacts = await db.select().from(contacts).where(eq7(contacts.userId, userId));
      res.json({ contacts: userContacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });
  app2.post("/api/contacts", requireAuth, async (req, res) => {
    try {
      const { id, userId, name, role, color } = req.body;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const contactValues = {
        userId,
        name,
        role: role || null,
        color: color || "#007AFF"
      };
      if (id) {
        contactValues.id = id;
      }
      const result = await db.insert(contacts).values(contactValues).returning();
      res.json({ contact: result[0] });
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });
  app2.delete("/api/contacts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(contacts).where(eq7(contacts.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });
  app2.put("/api/users/:id/push-token", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { pushToken, notificationsEnabled, timezoneOffsetMinutes } = req.body;
      const updates = {};
      if (pushToken !== void 0) updates.pushToken = pushToken;
      if (notificationsEnabled !== void 0) updates.notificationsEnabled = notificationsEnabled;
      if (Number.isInteger(timezoneOffsetMinutes) && Math.abs(timezoneOffsetMinutes) <= 14 * 60) {
        updates.timezoneOffsetMinutes = timezoneOffsetMinutes;
      }
      const result = await db.update(users).set(updates).where(eq7(users.id, id)).returning();
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: result[0] });
    } catch (error) {
      console.error("Update push token error:", error);
      res.status(500).json({ error: "Failed to update push token" });
    }
  });
  app2.get("/api/web-push/vapid-public-key", async (_req, res) => {
    try {
      const keys = await getVapidKeys();
      res.json({ publicKey: keys.publicKey });
    } catch (error) {
      console.error("VAPID public key error:", error);
      res.status(500).json({ error: "Failed to get VAPID public key" });
    }
  });
  app2.post("/api/users/:id/web-push-subscriptions", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { subscription, timezoneOffsetMinutes } = req.body;
      if (!subscription?.endpoint || typeof subscription.endpoint !== "string" || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return res.status(400).json({ error: "Invalid subscription" });
      }
      await saveWebPushSubscription(id, subscription);
      const updates = { notificationsEnabled: true };
      if (Number.isInteger(timezoneOffsetMinutes) && Math.abs(timezoneOffsetMinutes) <= 14 * 60) {
        updates.timezoneOffsetMinutes = timezoneOffsetMinutes;
      }
      await db.update(users).set(updates).where(eq7(users.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Save web push subscription error:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });
  app2.delete("/api/users/:id/web-push-subscriptions", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const { endpoint } = req.body;
      if (!endpoint || typeof endpoint !== "string") {
        return res.status(400).json({ error: "endpoint is required" });
      }
      await deleteWebPushSubscription(id, endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete web push subscription error:", error);
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });
  app2.get("/api/users/:id/notification-prefs", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const result = await db.select({
        notificationsEnabled: users.notificationsEnabled,
        notificationIntensity: users.notificationIntensity,
        escalatingRemindersEnabled: users.escalatingRemindersEnabled,
        morningKickoffEnabled: users.morningKickoffEnabled,
        eveningCheckinEnabled: users.eveningCheckinEnabled,
        streakSaverEnabled: users.streakSaverEnabled,
        morningKickoffHour: users.morningKickoffHour,
        eveningCheckinHour: users.eveningCheckinHour
      }).from(users).where(eq7(users.id, id)).limit(1);
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ prefs: result[0] });
    } catch (error) {
      console.error("Get notification prefs error:", error);
      res.status(500).json({ error: "Failed to get notification preferences" });
    }
  });
  app2.put("/api/users/:id/notification-prefs", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const {
        notificationIntensity,
        escalatingRemindersEnabled,
        morningKickoffEnabled,
        eveningCheckinEnabled,
        streakSaverEnabled,
        morningKickoffHour,
        eveningCheckinHour,
        timezoneOffsetMinutes
      } = req.body;
      const updates = {};
      if (notificationIntensity !== void 0) {
        if (!["gentle", "standard", "relentless"].includes(notificationIntensity)) {
          return res.status(400).json({ error: "Invalid intensity" });
        }
        updates.notificationIntensity = notificationIntensity;
      }
      if (typeof escalatingRemindersEnabled === "boolean") updates.escalatingRemindersEnabled = escalatingRemindersEnabled;
      if (typeof morningKickoffEnabled === "boolean") updates.morningKickoffEnabled = morningKickoffEnabled;
      if (typeof eveningCheckinEnabled === "boolean") updates.eveningCheckinEnabled = eveningCheckinEnabled;
      if (typeof streakSaverEnabled === "boolean") updates.streakSaverEnabled = streakSaverEnabled;
      if (Number.isInteger(morningKickoffHour) && morningKickoffHour >= 5 && morningKickoffHour <= 12) {
        updates.morningKickoffHour = morningKickoffHour;
      }
      if (Number.isInteger(eveningCheckinHour) && eveningCheckinHour >= 15 && eveningCheckinHour <= 22) {
        updates.eveningCheckinHour = eveningCheckinHour;
      }
      if (Number.isInteger(timezoneOffsetMinutes) && Math.abs(timezoneOffsetMinutes) <= 14 * 60) {
        updates.timezoneOffsetMinutes = timezoneOffsetMinutes;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid preferences provided" });
      }
      const result = await db.update(users).set(updates).where(eq7(users.id, id)).returning({ id: users.id });
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update notification prefs error:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });
  app2.get("/api/stats/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const stats = await db.select().from(userStats).where(eq7(userStats.userId, userId)).limit(1);
      if (stats.length === 0) {
        const result = await db.insert(userStats).values({ userId }).returning();
        return res.json({ stats: result[0] });
      }
      res.json({ stats: stats[0] });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });
  app2.put("/api/stats/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updates = req.body;
      delete updates.id;
      delete updates.userId;
      if (updates.lastActiveDate) updates.lastActiveDate = updates.lastActiveDate;
      const result = await db.update(userStats).set(updates).where(eq7(userStats.userId, userId)).returning();
      if (result.length === 0) {
        const inserted = await db.insert(userStats).values({ userId, ...updates }).returning();
        return res.json({ stats: inserted[0] });
      }
      res.json({ stats: result[0] });
    } catch (error) {
      console.error("Update stats error:", error);
      res.status(500).json({ error: "Failed to update stats" });
    }
  });
  app2.post("/api/sync", requireAuth, async (req, res) => {
    try {
      const { userId, tasks: clientTasks, contacts: clientContacts, stats: clientStats } = req.body;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      for (const task of clientTasks || []) {
        const existing = await db.select().from(tasks).where(eq7(tasks.id, task.id)).limit(1);
        if (existing.length === 0) {
          await db.insert(tasks).values({
            id: task.id,
            userId,
            title: task.title,
            notes: task.notes || null,
            lane: task.lane,
            reminderType: task.reminderType || "soft",
            focusTimeMinutes: task.focusTimeMinutes || 0,
            isOverdue: task.isOverdue || false,
            createdAt: task.createdAt ? new Date(task.createdAt) : /* @__PURE__ */ new Date(),
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            assignedTo: task.assignedTo || null,
            delegationStatus: task.delegationStatus || null,
            delegatedAt: task.delegatedAt ? new Date(task.delegatedAt) : null,
            lastDelegationUpdate: task.lastDelegationUpdate ? new Date(task.lastDelegationUpdate) : null
          });
          for (const st of task.subtasks || []) {
            await db.insert(subtasks).values({
              id: st.id,
              taskId: task.id,
              title: st.title,
              completed: st.completed || false
            }).onConflictDoNothing();
          }
          for (const note of task.delegationNotes || []) {
            await db.insert(delegationNotes).values({
              id: note.id,
              taskId: task.id,
              type: note.type,
              text: note.text || null,
              createdAt: note.createdAt ? new Date(note.createdAt) : /* @__PURE__ */ new Date()
            }).onConflictDoNothing();
          }
        }
      }
      for (const contact of clientContacts || []) {
        const existing = await db.select().from(contacts).where(eq7(contacts.id, contact.id)).limit(1);
        if (existing.length === 0) {
          await db.insert(contacts).values({
            id: contact.id,
            userId,
            name: contact.name,
            role: contact.role || null,
            color: contact.color || "#007AFF",
            createdAt: contact.createdAt ? new Date(contact.createdAt) : /* @__PURE__ */ new Date()
          });
        }
      }
      if (clientStats) {
        await db.insert(userStats).values({
          userId,
          ...clientStats,
          lastActiveDate: clientStats.lastActiveDate || null
        }).onConflictDoUpdate({
          target: userStats.userId,
          set: clientStats
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });
  function generateInviteCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  app2.put("/api/users/:id/display-name", async (req, res) => {
    try {
      const { id } = req.params;
      const { displayName } = req.body;
      const result = await db.update(users).set({ displayName }).where(eq7(users.id, id)).returning();
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: { id: result[0].id, email: result[0].email, displayName: result[0].displayName } });
    } catch (error) {
      console.error("Update display name error:", error);
      res.status(500).json({ error: "Failed to update display name" });
    }
  });
  app2.post("/api/team/invite", async (req, res) => {
    try {
      const { inviterId, inviteeEmail } = req.body;
      let inviteCode = generateInviteCode();
      let attempts = 0;
      while (attempts < 5) {
        const existing = await db.select().from(teamInvites).where(eq7(teamInvites.inviteCode, inviteCode)).limit(1);
        if (existing.length === 0) break;
        inviteCode = generateInviteCode();
        attempts++;
      }
      const expiresAt = /* @__PURE__ */ new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const result = await db.insert(teamInvites).values({
        inviteCode,
        inviterId,
        inviteeEmail: inviteeEmail || null,
        status: "pending",
        expiresAt
      }).returning();
      res.json({ invite: result[0] });
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });
  app2.get("/api/team/invites/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const sentInvites = await db.select().from(teamInvites).where(
        and5(eq7(teamInvites.inviterId, userId), eq7(teamInvites.status, "pending"))
      );
      const userRecord = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      const userEmail = userRecord[0]?.email;
      let receivedInvites = [];
      if (userEmail) {
        const invites = await db.select().from(teamInvites).where(
          and5(eq7(teamInvites.inviteeEmail, userEmail), eq7(teamInvites.status, "pending"))
        );
        for (const invite of invites) {
          const inviter = await db.select().from(users).where(eq7(users.id, invite.inviterId)).limit(1);
          receivedInvites.push({
            ...invite,
            inviterEmail: inviter[0]?.email,
            inviterName: inviter[0]?.displayName
          });
        }
      }
      res.json({ sentInvites, receivedInvites });
    } catch (error) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: "Failed to get invites" });
    }
  });
  app2.post("/api/team/invite/accept", async (req, res) => {
    try {
      const { inviteCode, userId } = req.body;
      const inviteResult = await db.select().from(teamInvites).where(eq7(teamInvites.inviteCode, inviteCode)).limit(1);
      if (inviteResult.length === 0) {
        return res.status(404).json({ error: "Invite not found" });
      }
      const invite = inviteResult[0];
      if (invite.status !== "pending") {
        return res.status(400).json({ error: "Invite is no longer valid" });
      }
      if (invite.expiresAt && new Date(invite.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.status(400).json({ error: "Invite has expired" });
      }
      if (invite.inviterId === userId) {
        return res.status(400).json({ error: "Can't join your own team" });
      }
      const existingRelation = await db.select().from(teamMembers).where(
        or2(
          and5(eq7(teamMembers.userId, invite.inviterId), eq7(teamMembers.teammateId, userId)),
          and5(eq7(teamMembers.userId, userId), eq7(teamMembers.teammateId, invite.inviterId))
        )
      ).limit(1);
      if (existingRelation.length > 0) {
        await db.update(teamInvites).set({ status: "accepted" }).where(eq7(teamInvites.id, invite.id));
        return res.json({ message: "Already team members", teamMember: existingRelation[0] });
      }
      const colors = ["#FF3B30", "#FF9500", "#007AFF", "#AF52DE", "#34C759", "#5856D6"];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const inviterUser = await db.select().from(users).where(eq7(users.id, invite.inviterId)).limit(1);
      const acceptingUser = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      await db.insert(teamMembers).values({
        userId: invite.inviterId,
        teammateId: userId,
        nickname: acceptingUser[0]?.displayName || acceptingUser[0]?.email?.split("@")[0] || "Teammate",
        color: randomColor
      });
      const randomColor2 = colors[Math.floor(Math.random() * colors.length)];
      const result = await db.insert(teamMembers).values({
        userId,
        teammateId: invite.inviterId,
        nickname: inviterUser[0]?.displayName || inviterUser[0]?.email?.split("@")[0] || "Teammate",
        color: randomColor2
      }).returning();
      await db.update(teamInvites).set({ status: "accepted" }).where(eq7(teamInvites.id, invite.id));
      res.json({ teamMember: result[0] });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });
  app2.post("/api/team/invite/decline", async (req, res) => {
    try {
      const { inviteId } = req.body;
      await db.update(teamInvites).set({ status: "declined" }).where(eq7(teamInvites.id, inviteId));
      res.json({ success: true });
    } catch (error) {
      console.error("Decline invite error:", error);
      res.status(500).json({ error: "Failed to decline invite" });
    }
  });
  app2.delete("/api/team/invite/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(teamInvites).where(eq7(teamInvites.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel invite error:", error);
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });
  app2.post("/api/team/invite/:id/resend", async (req, res) => {
    try {
      const { id } = req.params;
      const invite = await db.select().from(teamInvites).where(eq7(teamInvites.id, id)).limit(1);
      if (invite.length === 0) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json({ invite: invite[0] });
    } catch (error) {
      console.error("Resend invite error:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });
  app2.post("/api/team/invite/:id/regenerate", async (req, res) => {
    try {
      const { id } = req.params;
      const invite = await db.select().from(teamInvites).where(eq7(teamInvites.id, id)).limit(1);
      if (invite.length === 0) {
        return res.status(404).json({ error: "Invite not found" });
      }
      const newCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newExpiry = /* @__PURE__ */ new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      const updated = await db.update(teamInvites).set({
        inviteCode: newCode,
        expiresAt: newExpiry,
        status: "pending"
      }).where(eq7(teamInvites.id, id)).returning();
      res.json({ invite: updated[0] });
    } catch (error) {
      console.error("Regenerate invite error:", error);
      res.status(500).json({ error: "Failed to regenerate invite" });
    }
  });
  app2.get("/api/team/members/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const members = await db.select().from(teamMembers).where(eq7(teamMembers.userId, userId));
      const membersWithDetails = [];
      for (const member of members) {
        const teammate = await db.select().from(users).where(eq7(users.id, member.teammateId)).limit(1);
        if (teammate[0]) {
          membersWithDetails.push({
            ...member,
            teammateEmail: teammate[0].email,
            teammateName: teammate[0].displayName || teammate[0].email?.split("@")[0]
          });
        }
      }
      res.json({ members: membersWithDetails });
    } catch (error) {
      console.error("Get team members error:", error);
      res.status(500).json({ error: "Failed to get team members" });
    }
  });
  app2.delete("/api/team/members/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const member = await db.select().from(teamMembers).where(eq7(teamMembers.id, id)).limit(1);
      if (member.length === 0) {
        return res.status(404).json({ error: "Team member not found" });
      }
      await db.delete(teamMembers).where(eq7(teamMembers.id, id));
      await db.delete(teamMembers).where(
        and5(
          eq7(teamMembers.userId, member[0].teammateId),
          eq7(teamMembers.teammateId, userId)
        )
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Remove team member error:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });
  app2.get("/api/delegated-to-me/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const delegatedTasks = await db.select().from(tasks).where(
        and5(
          eq7(tasks.delegatedToUserId, userId),
          eq7(tasks.completedAt, null)
        )
      );
      const taskIds = delegatedTasks.map((t) => t.id);
      let taskSubtasks = [];
      let taskNotes = [];
      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray2(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray2(delegationNotes.taskId, taskIds));
      }
      const tasksWithDetails = await Promise.all(delegatedTasks.map(async (task) => {
        const owner = await db.select().from(users).where(eq7(users.id, task.userId)).limit(1);
        return {
          ...task,
          subtasks: taskSubtasks.filter((s) => s.taskId === task.id),
          delegationNotes: taskNotes.filter((n) => n.taskId === task.id),
          ownerName: owner[0]?.displayName || owner[0]?.email?.split("@")[0] || "Unknown",
          ownerEmail: owner[0]?.email
        };
      }));
      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get delegated tasks error:", error);
      res.status(500).json({ error: "Failed to get delegated tasks" });
    }
  });
  app2.put("/api/delegation-status/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { userId, status, note } = req.body;
      const task = await db.select().from(tasks).where(eq7(tasks.id, taskId)).limit(1);
      if (task.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task[0].delegatedToUserId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }
      const result = await db.update(tasks).set({
        delegationStatus: status,
        lastDelegationUpdate: /* @__PURE__ */ new Date()
      }).where(eq7(tasks.id, taskId)).returning();
      if (note) {
        await db.insert(delegationNotes).values({
          taskId,
          authorId: userId,
          type: "status_update",
          text: note
        });
      }
      res.json({ task: result[0] });
    } catch (error) {
      console.error("Update delegation status error:", error);
      res.status(500).json({ error: "Failed to update delegation status" });
    }
  });
  app2.post("/api/delegation-notes", async (req, res) => {
    try {
      const { taskId, authorId, type, text: text2 } = req.body;
      const result = await db.insert(delegationNotes).values({
        taskId,
        authorId: authorId || null,
        type,
        text: text2 || null
      }).returning();
      res.json({ note: result[0] });
    } catch (error) {
      console.error("Create delegation note error:", error);
      res.status(500).json({ error: "Failed to create delegation note" });
    }
  });
  app2.delete("/api/account/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const userResult = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      if (userResult.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = userResult[0];
      if (user.passwordHash && password) {
        const validPassword = await bcrypt2.compare(password, user.passwordHash);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid password" });
        }
      } else if (user.passwordHash && !password) {
        return res.status(400).json({ error: "Password is required to delete account" });
      }
      await db.delete(delegationNotes).where(eq7(delegationNotes.authorId, userId));
      await db.delete(subtasks).where(
        inArray2(
          subtasks.taskId,
          db.select({ id: tasks.id }).from(tasks).where(eq7(tasks.userId, userId))
        )
      );
      await db.delete(tasks).where(eq7(tasks.userId, userId));
      await db.delete(contacts).where(eq7(contacts.userId, userId));
      await db.delete(teamMembers).where(
        or2(eq7(teamMembers.userId, userId), eq7(teamMembers.teammateId, userId))
      );
      await db.delete(teamInvites).where(eq7(teamInvites.inviterId, userId));
      await db.delete(userStats).where(eq7(userStats.userId, userId));
      await db.delete(users).where(eq7(users.id, userId));
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
  app2.get("/api/subscription/:userId", requireAuth, async (req, res) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const userRecord = await db.select().from(users).where(eq7(users.id, userId)).limit(1);
      if (userRecord.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = userRecord[0];
      const status = user.subscriptionStatus || "none";
      const trialEndsAt = user.trialEndsAt ? user.trialEndsAt.toISOString() : null;
      const OWNER_EMAILS = ["troyevansspeaks@gmail.com"];
      const isOwner = !!user.email && OWNER_EMAILS.includes(user.email.toLowerCase());
      const isTrialing = status === "trialing" && trialEndsAt && new Date(trialEndsAt) > /* @__PURE__ */ new Date();
      const isActive = isOwner || status === "active" || status === "pro" || isTrialing;
      const lifetimeTasksCreated = user.lifetimeTasksCreated || 0;
      const freeTrialActive = !isActive && lifetimeTasksCreated < 10;
      res.json({
        subscription: {
          status: isTrialing ? "trialing" : status,
          trialEndsAt,
          isActive,
          isTrialing: !!isTrialing,
          lifetimeTasksCreated,
          freeTrialActive,
          freeTasksRemaining: freeTrialActive ? 10 - lifetimeTasksCreated : 0
        }
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });
  app2.post("/api/webhooks/revenuecat", async (req, res) => {
    try {
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
      if (webhookSecret) {
        const authHeader = req.headers["authorization"] || "";
        const stripBearer = (val) => val.trim().replace(/^Bearer\s+/i, "");
        const headerValue = stripBearer(authHeader);
        const secretValue = stripBearer(webhookSecret);
        if (!headerValue || headerValue !== secretValue) {
          console.error("[RevenueCat Webhook] Auth failed");
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      res.status(200).json({ received: true });
      const { event } = req.body;
      if (!event) {
        console.error("[RevenueCat Webhook] No event in payload");
        return;
      }
      const {
        type,
        app_user_id,
        expiration_at_ms,
        period_type
      } = event;
      console.log(`[RevenueCat Webhook] Event: ${type}, User: ${app_user_id}`);
      if (!app_user_id) {
        console.error("[RevenueCat Webhook] No app_user_id in event");
        return;
      }
      const userRecord = await db.select().from(users).where(eq7(users.id, app_user_id)).limit(1);
      if (userRecord.length === 0) {
        console.error(`[RevenueCat Webhook] User not found: ${app_user_id}`);
        return;
      }
      let newStatus = userRecord[0].subscriptionStatus || "none";
      let trialEndsAt = userRecord[0].trialEndsAt || null;
      switch (type) {
        case "INITIAL_PURCHASE":
        case "RENEWAL":
        case "UNCANCELLATION":
        case "SUBSCRIPTION_EXTENDED":
          if (period_type === "TRIAL") {
            newStatus = "trialing";
            if (expiration_at_ms) {
              trialEndsAt = new Date(expiration_at_ms);
            }
          } else {
            newStatus = "active";
          }
          break;
        case "CANCELLATION":
          newStatus = "canceled";
          break;
        case "EXPIRATION":
          newStatus = "none";
          trialEndsAt = null;
          break;
        case "BILLING_ISSUE":
          newStatus = "past_due";
          break;
        case "PRODUCT_CHANGE":
          newStatus = "active";
          break;
        case "NON_RENEWING_PURCHASE":
          newStatus = "active";
          break;
        case "TEST":
          console.log(`[RevenueCat Webhook] Test event received successfully`);
          return;
        default:
          console.log(`[RevenueCat Webhook] Unhandled event type: ${type}`);
          return;
      }
      await db.update(users).set({
        subscriptionStatus: newStatus,
        trialEndsAt
      }).where(eq7(users.id, app_user_id));
      console.log(`[RevenueCat Webhook] Updated user ${app_user_id}: status=${newStatus}`);
    } catch (error) {
      console.error("[RevenueCat Webhook] Processing error:", error);
    }
  });
  app2.post("/api/errors/report", optionalAuth, async (req, res) => {
    try {
      const { message, platform, appVersion, timestamp: timestamp2 } = req.body;
      if (!message || typeof message !== "string" || message.length > 5e3) {
        return res.status(400).json({ error: "Invalid error report" });
      }
      console.error("[Client Error]", {
        message: message.substring(0, 500),
        platform: String(platform || "unknown").substring(0, 20),
        appVersion: String(appVersion || "unknown").substring(0, 20),
        timestamp: String(timestamp2 || "").substring(0, 30),
        authenticated: !!req.user
      });
      res.json({ received: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log error" });
    }
  });
  app2.get("/api/users/:id/notification-settings", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const [user] = await db.select({
        pushToken: users.pushToken,
        notificationsEnabled: users.notificationsEnabled
      }).from(users).where(eq7(users.id, id)).limit(1);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const webSubs = await db.select({ id: webPushSubscriptions.id }).from(webPushSubscriptions).where(eq7(webPushSubscriptions.userId, id)).limit(1);
      res.json({
        notificationsEnabled: user.notificationsEnabled || false,
        hasPushToken: !!user.pushToken,
        hasWebPushSubscription: webSubs.length > 0
      });
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ error: "Failed to get notification settings" });
    }
  });
  app2.post("/api/notifications/test", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const [user] = await db.select().from(users).where(eq7(users.id, req.user.userId)).limit(1);
      const webSent = await sendWebPushNotifications([
        {
          userId: req.user.userId,
          title: "I GET IT DONE",
          body: "Browser notifications are working! You'll receive task reminders here.",
          data: { type: "test" }
        }
      ]);
      let mobileSent = false;
      if (user?.pushToken) {
        mobileSent = await sendPushNotification(
          user.pushToken,
          "I GET IT DONE",
          "Push notifications are working! You'll receive task reminders here.",
          { type: "test" }
        );
      }
      if (!user?.pushToken && webSent === 0) {
        return res.status(400).json({ error: "No push token registered. Enable notifications first." });
      }
      res.json({ success: mobileSent || webSent > 0 });
    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    app2.post("/api/notifications/test/escalating", requireAuth, async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq7(users.id, req.user.userId)).limit(1);
        if (!user?.pushToken) return res.status(400).json({ error: "No push token registered" });
        const [task] = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and5(eq7(tasks.userId, req.user.userId), isNull5(tasks.completedAt))).limit(1);
        const taskId = task?.id ?? "test-task";
        const taskTitle = task?.title ?? "Your first task";
        const t = taskTitle.length > 60 ? taskTitle.slice(0, 57) + "..." : taskTitle;
        const result = await sendBulkPushNotifications([{
          token: user.pushToken,
          title: "Still on your plate",
          body: `"${t}" hasn't moved. Want to knock it out right now? Tap to start a focus timer.`,
          data: { type: "escalating_nudge", taskId },
          categoryId: "task_nudge"
        }]);
        res.json({ success: result.sent > 0, taskId, taskTitle });
      } catch (err) {
        console.error("Dev escalating nudge error:", err);
        res.status(500).json({ error: "Failed to send test escalating nudge" });
      }
    });
    app2.post("/api/notifications/test/morning-kickoff", requireAuth, async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq7(users.id, req.user.userId)).limit(1);
        if (!user?.pushToken) return res.status(400).json({ error: "No push token registered" });
        const open = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(and5(eq7(tasks.userId, req.user.userId), isNull5(tasks.completedAt)));
        const body = open.length === 0 ? "Nothing on your list. Add something worth doing today." : open.length === 1 ? `One thing on your list: "${open[0].title}". Do it early, own the day.` : `${open.length} tasks are waiting. Don't scan the list \u2014 pick ONE and start. "${open[0].title}"?`;
        const result = await sendBulkPushNotifications([{
          token: user.pushToken,
          title: "Good morning \u2014 what's your ONE thing?",
          body,
          data: { type: "morning_kickoff" }
        }]);
        res.json({ success: result.sent > 0, openTaskCount: open.length });
      } catch (err) {
        console.error("Dev morning kickoff error:", err);
        res.status(500).json({ error: "Failed to send test morning kickoff" });
      }
    });
    app2.post("/api/notifications/test/streak-saver", requireAuth, async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq7(users.id, req.user.userId)).limit(1);
        if (!user?.pushToken) return res.status(400).json({ error: "No push token registered" });
        const [stats] = await db.select({ currentStreak: userStats.currentStreak }).from(userStats).where(eq7(userStats.userId, req.user.userId)).limit(1);
        const streak = stats?.currentStreak ?? 3;
        const result = await sendBulkPushNotifications([{
          token: user.pushToken,
          title: `Your ${streak}-day streak dies at midnight`,
          body: "You're ONE task away from saving it. Pick the smallest thing on your list and go.",
          data: { type: "streak_saver", streak },
          categoryId: "task_nudge"
        }]);
        res.json({ success: result.sent > 0, streak });
      } catch (err) {
        console.error("Dev streak saver error:", err);
        res.status(500).json({ error: "Failed to send test streak saver" });
      }
    });
  }
  startNotificationScheduler();
  const httpServer = createServer(app2);
  return httpServer;
}

// server/migrate.ts
init_db();
import * as fs2 from "fs";
import * as path from "path";
async function runMigrations() {
  const dir = path.resolve(process.cwd(), "migrations");
  if (!fs2.existsSync(dir)) return;
  const files = fs2.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  if (files.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name varchar(255) PRIMARY KEY,
         applied_at timestamp DEFAULT now()
       )`
    );
    for (const file of files) {
      const { rows } = await client.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
      if (rows.length > 0) continue;
      const sql5 = fs2.readFileSync(path.join(dir, file), "utf-8");
      console.log(`Applying migration: ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql5);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

// server/index.ts
import * as fs3 from "fs";
import * as path2 from "path";
var app = express();
var log = console.log;
function validateEnvironment() {
  const isProduction = process.env.NODE_ENV === "production";
  const requiredVars = ["DATABASE_URL"];
  const recommendedVars = isProduction ? ["JWT_SECRET", "DEEPGRAM_API_KEY", "OPENAI_API_KEY"] : [];
  const missingRequired = requiredVars.filter((v) => !process.env[v]);
  const missingRecommended = recommendedVars.filter((v) => !process.env[v]);
  if (missingRequired.length > 0) {
    log(`ERROR: Missing required environment variables: ${missingRequired.join(", ")}`);
  }
  if (missingRecommended.length > 0 && isProduction) {
    log(`WARNING: Missing recommended environment variables for production: ${missingRecommended.join(", ")}`);
  }
}
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      const devDomain = process.env.REPLIT_DEV_DOMAIN;
      origins.add(`https://${devDomain}`);
      origins.add(`https://${devDomain}:5000`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        const domain = d.trim();
        origins.add(`https://${domain}`);
        origins.add(`https://www.${domain}`);
        origins.add(`https://${domain}:5000`);
      });
    }
    const origin = req.header("origin");
    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      log(`${req.method} ${path3} ${res.statusCode} in ${duration}ms`);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs3.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs3.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs3.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs3.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const supportTemplate = fs3.readFileSync(
    path2.resolve(process.cwd(), "server", "templates", "support.html"),
    "utf-8"
  );
  const privacyTemplate = fs3.readFileSync(
    path2.resolve(process.cwd(), "server", "templates", "privacy.html"),
    "utf-8"
  );
  const marketingTemplate = fs3.readFileSync(
    path2.resolve(process.cwd(), "server", "templates", "marketing.html"),
    "utf-8"
  );
  const appStorePrivacyTemplate = fs3.readFileSync(
    path2.resolve(process.cwd(), "server", "templates", "app-store-privacy.html"),
    "utf-8"
  );
  const termsTemplate = fs3.readFileSync(
    path2.resolve(process.cwd(), "server", "templates", "terms.html"),
    "utf-8"
  );
  const dataDeletionTemplate = fs3.readFileSync(
    path2.resolve(process.cwd(), "server", "templates", "data-deletion.html"),
    "utf-8"
  );
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path === "/support") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(supportTemplate);
    }
    if (req.path === "/privacy") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(privacyTemplate);
    }
    if (req.path === "/marketing") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(marketingTemplate);
    }
    if (req.path === "/app-store-privacy") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(appStorePrivacyTemplate);
    }
    if (req.path === "/terms") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(termsTemplate);
    }
    if (req.path === "/data-deletion") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(dataDeletionTemplate);
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express.static(path2.resolve(process.cwd(), "public")));
  app2.use(express.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
(async () => {
  validateEnvironment();
  setupCors(app);
  app.set("trust proxy", 1);
  setupBodyParsing(app);
  app.use(cookieParser());
  const authLimiter = rateLimit2({
    windowMs: 15 * 60 * 1e3,
    max: 20,
    message: { error: "Too many attempts, please try again later" },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/auth/forgot-password", authLimiter);
  const errorReportLimiter = rateLimit2({
    windowMs: 60 * 1e3,
    max: 10,
    message: { error: "Too many error reports" },
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use("/api/errors/report", errorReportLimiter);
  setupRequestLogging(app);
  await runMigrations();
  const server = await registerRoutes(app);
  configureExpoAndLanding(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, date, real, numeric, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Existing startup migration bookkeeping is part of the database, not disposable.
export const schemaMigrations = pgTable("schema_migrations", {
  name: varchar("name", { length: 255 }).primaryKey(),
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
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
  createdAt: timestamp("created_at").defaultNow(),
});

// Browser (Web Push API) subscriptions — a user may have several browsers registered.
export const webPushSubscriptions = pgTable("web_push_subscriptions", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Single-row table holding the server's VAPID keypair (generated on first use).
export const vapidConfig = pgTable("vapid_config", {
  id: integer("id").primaryKey().default(1),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------- MCP OAuth (dynamic client registration + PKCE) ----------

export const oauthClients = pgTable("oauth_clients", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  clientName: varchar("client_name", { length: 255 }),
  redirectUris: text("redirect_uris").notNull(), // JSON array of allowed redirect URIs
  tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", { length: 50 }).default("none"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const oauthCodes = pgTable("oauth_codes", {
  code: varchar("code", { length: 255 }).primaryKey(),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: varchar("code_challenge", { length: 255 }),
  codeChallengeMethod: varchar("code_challenge_method", { length: 10 }),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessTokenHash: varchar("access_token_hash", { length: 64 }).notNull().unique(),
  refreshTokenHash: varchar("refresh_token_hash", { length: 64 }).unique(),
  accessExpiresAt: timestamp("access_expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at"),
  revokedAt: timestamp("revoked_at"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
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
  lastDelegationUpdate: timestamp("last_delegation_update"),
});

export const subtasks = pgTable("subtasks", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  taskId: varchar("task_id", { length: 255 }).references(() => tasks.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 500 }).notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const delegationNotes = pgTable("delegation_notes", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  taskId: varchar("task_id", { length: 255 }).references(() => tasks.id, { onDelete: "cascade" }),
  authorId: varchar("author_id", { length: 255 }).references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  text: text("text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamInvites = pgTable("team_invites", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  inviteCode: varchar("invite_code", { length: 20 }).unique().notNull(),
  inviterId: varchar("inviter_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  inviteeEmail: varchar("invitee_email", { length: 255 }),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  teammateId: varchar("teammate_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  nickname: varchar("nickname", { length: 255 }),
  role: varchar("role", { length: 255 }),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userStats = pgTable("user_stats", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 }).unique().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  totalTasksCompleted: integer("total_tasks_completed").default(0),
  totalSubtasksCompleted: integer("total_subtasks_completed").default(0),
  totalFocusMinutes: integer("total_focus_minutes").default(0),
  points: integer("points").default(0),
  level: varchar("level", { length: 20 }).default("starter"),
  lastActiveDate: date("last_active_date"),
  streakProtectionUsed: boolean("streak_protection_used").default(false),
});

// Personal connector keys for the MCP endpoint (Claude & other AI chats).
// Only a SHA-256 hash of the key is stored; the plaintext is shown once at creation.
export const connectorKeys = pgTable("connector_keys", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  keyHash: varchar("key_hash", { length: 64 }).notNull().unique(),
  keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),
  label: varchar("label", { length: 100 }),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const voiceUsage = pgTable("voice_usage", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  secondsUsed: integer("seconds_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// One row per billable AI call. Costs are computed in the admin from these units.
export const aiUsage = pgTable("ai_usage", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  provider: varchar("provider", { length: 20 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  feature: varchar("feature", { length: 50 }).notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  audioSeconds: real("audio_seconds").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("ai_usage_created_at_idx").on(t.createdAt),
  index("ai_usage_user_id_idx").on(t.userId, t.createdAt),
]);

// RevenueCat webhook events, kept for revenue per user. event_id makes retries idempotent.
export const billingEvents = pgTable("billing_events", {
  id: varchar("id", { length: 255 })
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  eventId: varchar("event_id", { length: 255 }).notNull().unique(),
  userId: varchar("user_id", { length: 255 }).references(() => users.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(),
  productId: varchar("product_id", { length: 255 }),
  store: varchar("store", { length: 50 }),
  environment: varchar("environment", { length: 20 }),
  periodType: varchar("period_type", { length: 20 }),
  priceUsd: numeric("price_usd", { precision: 12, scale: 4 }),
  takehomePercentage: numeric("takehome_percentage", { precision: 6, scale: 4 }),
  eventAt: timestamp("event_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("billing_events_user_id_idx").on(t.userId, t.eventAt),
  index("billing_events_event_at_idx").on(t.eventAt),
]);

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertTaskSchema = createInsertSchema(tasks);
export const selectTaskSchema = createSelectSchema(tasks);
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export const insertSubtaskSchema = createInsertSchema(subtasks);
export const selectSubtaskSchema = createSelectSchema(subtasks);
export type InsertSubtask = z.infer<typeof insertSubtaskSchema>;
export type Subtask = typeof subtasks.$inferSelect;

export const insertContactSchema = createInsertSchema(contacts);
export const selectContactSchema = createSelectSchema(contacts);
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

export const insertDelegationNoteSchema = createInsertSchema(delegationNotes);
export type InsertDelegationNote = z.infer<typeof insertDelegationNoteSchema>;
export type DelegationNote = typeof delegationNotes.$inferSelect;

export const insertUserStatsSchema = createInsertSchema(userStats);
export type InsertUserStats = z.infer<typeof insertUserStatsSchema>;
export type UserStats = typeof userStats.$inferSelect;

export const insertTeamInviteSchema = createInsertSchema(teamInvites);
export type InsertTeamInvite = z.infer<typeof insertTeamInviteSchema>;
export type TeamInvite = typeof teamInvites.$inferSelect;

export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type ConnectorKey = typeof connectorKeys.$inferSelect;

export const insertVoiceUsageSchema = createInsertSchema(voiceUsage);
export type InsertVoiceUsage = z.infer<typeof insertVoiceUsageSchema>;
export type VoiceUsage = typeof voiceUsage.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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

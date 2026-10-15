import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "fs";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, tasks, subtasks, contacts, delegationNotes, userStats, teamInvites, teamMembers, voiceUsage } from "@shared/schema";
import { generateToken, requireAuth, optionalAuth, validateUserAccess, type AuthenticatedRequest } from "./authMiddleware";
import { getVapidKeys, saveWebPushSubscription, deleteWebPushSubscription, sendWebPushNotifications } from "./webPush";
import { webPushSubscriptions } from "@shared/schema";
import { sendPushNotification, sendDelegationNotification, sendDelegationStatusNotification, startNotificationScheduler, sendBulkPushNotifications } from "./pushNotifications";
import { applyCompletionStats } from "./taskActions";
import { registerMcpRoutes, registerConnectorKeyRoutes } from "./mcp";
import { registerOAuthRoutes } from "./oauth";

const DAILY_VOICE_LIMIT_SECONDS = 600;
// Overridable so integration tests can point at a local stub.
const DEEPGRAM_LISTEN_URL = process.env.DEEPGRAM_API_URL || "https://api.deepgram.com/v1/listen";
const OPENAI_CHAT_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1/chat/completions";
const FREE_TASK_LIMIT = 10;
import { eq, and, inArray, or, sql, isNull, isNotNull } from "drizzle-orm";

const upload = multer({
  dest: "/tmp/audio-uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }
});

const LANES = ["now", "soon", "later", "park"];
const REMINDER_TYPES = ["soft", "strong", "persistent", "none"];
const DELEGATION_STATUSES = ["assigned", "in_progress", "waiting", "needs_review", "done"];
const DELEGATION_STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting: "Waiting",
  needs_review: "Needs Review",
  done: "Done",
};
const DELEGATION_NOTE_TYPES = ["update", "blocked", "question", "completed", "custom", "status_update"];
const INVITE_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PASSWORD_RULES: { test: (p: string) => boolean; error: string }[] = [
  { test: (p) => p.length >= 8, error: "Password must be at least 8 characters" },
  { test: (p) => /[A-Z]/.test(p), error: "Password must include at least one uppercase letter" },
  { test: (p) => /[a-z]/.test(p), error: "Password must include at least one lowercase letter" },
  { test: (p) => /[0-9]/.test(p), error: "Password must include at least one number" },
  { test: (p) => /[^A-Za-z0-9]/.test(p), error: "Password must include at least one special character" },
];

function passwordPolicyError(password: unknown): string | null {
  if (typeof password !== "string") return "Password is required";
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? failed.error : null;
}

// Older app builds still put the acting user's id in request bodies. The JWT is
// the source of truth; a body id that names someone else is rejected.
function bodyNamesOtherUser(req: AuthenticatedRequest, ...fields: string[]): boolean {
  return fields.some((field) => {
    const value = req.body?.[field];
    return value !== undefined && value !== null && value !== "" && value !== req.user?.userId;
  });
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalDate(value: unknown): Date | null | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value as string);
  return isNaN(date.getTime()) ? "invalid" : date;
}

function displayNameFor(user: { displayName: string | null; email: string | null } | undefined): string {
  return user?.displayName || user?.email?.split("@")[0] || "A teammate";
}

async function areTeammates(userId: string, teammateId: string): Promise<boolean> {
  const rows = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teammateId, teammateId)))
    .limit(1);
  return rows.length > 0;
}

// Older App Store builds hand a task to a linked teammate by saving only the
// teammate's nickname in assignedTo, without delegatedToUserId. Resolve that
// nickname to the teammate's account, but only when exactly one linked
// teammate has it, so a contact can never be mistaken for a teammate.
async function findTeammateByNickname(userId: string, nickname: string): Promise<string | null> {
  const rows = await db
    .select({ teammateId: teamMembers.teammateId })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.nickname, nickname)))
    .limit(2);
  return rows.length === 1 && rows[0].teammateId ? rows[0].teammateId : null;
}

async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 8; i++) code += INVITE_CODE_CHARS[randomInt(INVITE_CODE_CHARS.length)];
    const existing = await db.select({ id: teamInvites.id }).from(teamInvites).where(eq(teamInvites.inviteCode, code)).limit(1);
    if (existing.length === 0) return code;
  }
  throw new Error("Could not generate a unique invite code");
}

// Clears an in-flight hand-off on a task so it no longer shows for the delegate.
const CLEARED_DELEGATION = {
  delegatedToUserId: null,
  delegationStatus: null,
  assignedTo: null,
  delegatedAt: null,
  lastDelegationUpdate: null,
};

// Failed reset-code guesses per email. Five misses burn the code, so a 6-digit
// code can't be brute-forced within its 15-minute life.
const resetCodeFailures = new Map<string, number>();
const MAX_RESET_CODE_FAILURES = 5;

export async function registerRoutes(app: Express): Promise<Server> {
  registerOAuthRoutes(app);
  registerMcpRoutes(app);
  registerConnectorKeyRoutes(app);
  
  app.get("/api/debug/voice-check", async (req: Request, res: Response) => {
    const hasDeepgram = !!process.env.DEEPGRAM_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    res.json({ 
      deepgram: hasDeepgram ? "configured" : "MISSING", 
      openai: hasOpenAI ? "configured" : "MISSING",
      timestamp: new Date().toISOString()
    });
  });
  
  app.get("/api/voice-usage/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const existing = await db.select().from(voiceUsage)
        .where(and(eq(voiceUsage.userId, userId), eq(voiceUsage.date, today)))
        .limit(1);
      
      const secondsUsed = existing.length > 0 ? existing[0].secondsUsed || 0 : 0;
      const secondsRemaining = Math.max(0, DAILY_VOICE_LIMIT_SECONDS - secondsUsed);
      
      res.json({
        secondsUsed,
        secondsRemaining,
        dailyLimitSeconds: DAILY_VOICE_LIMIT_SECONDS,
        limitReached: secondsRemaining === 0,
      });
    } catch (error) {
      console.error("Voice usage error:", error);
      res.status(500).json({ error: "Failed to get voice usage" });
    }
  });

  app.post("/api/transcribe", requireAuth, upload.single("audio"), async (req: AuthenticatedRequest, res: Response) => {
    const audioFilePath = req.file?.path;
    try {
      if (!req.file) {
        console.error("[VOICE] No audio file in request");
        return res.status(400).json({ error: "No audio file provided" });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const clientDurationSeconds = Math.max(0, parseInt(req.body.durationSeconds) || 0);
      const today = new Date().toISOString().split('T')[0];

      const usageRows = await db.select().from(voiceUsage)
        .where(and(eq(voiceUsage.userId, userId), eq(voiceUsage.date, today)))
        .limit(1);
      const currentUsage = usageRows.length > 0 ? usageRows[0].secondsUsed || 0 : 0;

      // The client stops recording when the remaining quota runs out, so a
      // recording that starts with time left is always transcribed. Rejecting
      // it after the fact would throw away what the user just said.
      if (currentUsage >= DAILY_VOICE_LIMIT_SECONDS) {
        return res.status(429).json({
          error: "Daily voice limit reached",
          limitReached: true,
          secondsUsed: currentUsage,
          secondsRemaining: 0,
          dailyLimitSeconds: DAILY_VOICE_LIMIT_SECONDS,
        });
      }

      const apiKey = process.env.DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error("[VOICE] DEEPGRAM_API_KEY not configured");
        return res.status(503).json({ error: "Transcription service not configured" });
      }

      const audioBuffer = await fs.promises.readFile(req.file.path);
      if (audioBuffer.length === 0) {
        return res.json({ text: "", debug: { audioDuration: 0, fileSize: 0, confidence: 0 } });
      }

      // iOS/Android upload AAC in an MP4 container; browsers upload WebM/Opus
      // (Chrome, Firefox) or MP4 (Safari). Deepgram needs the real container type.
      const uploadedType = (req.file.mimetype || "").split(";")[0].trim().toLowerCase();
      const contentType = /^(audio|video)\//.test(uploadedType) ? uploadedType : "audio/mp4";

      let response: globalThis.Response;
      try {
        response = await fetch(`${DEEPGRAM_LISTEN_URL}?model=nova-3&smart_format=true&detect_language=true`, {
          method: "POST",
          headers: {
            "Authorization": `Token ${apiKey}`,
            "Content-Type": contentType,
          },
          body: audioBuffer,
          signal: AbortSignal.timeout(60_000),
        });
      } catch (fetchError: any) {
        console.error("[VOICE] Deepgram request failed:", fetchError?.name, fetchError?.message);
        return res.status(504).json({ error: "Transcription service timed out. Try again." });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[VOICE] Deepgram error:", response.status, errorText.substring(0, 300));
        // Never surface Deepgram auth failures as 401: the app treats 401 as an
        // expired login and would tell the user to sign in again.
        return res.status(502).json({ error: "Transcription service error. Try again." });
      }

      const result = await response.json();
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
      const audioDuration = result.metadata?.duration || 0;

      console.log("[VOICE] Transcribed", {
        bytes: audioBuffer.length,
        contentType,
        audioDuration,
        confidence,
        chars: transcript.length,
      });

      // Bill the longer of what the client measured and what Deepgram heard, so
      // the daily quota can't be skipped by under-reporting the duration.
      const billedSeconds = Math.max(clientDurationSeconds, Math.ceil(audioDuration));
      if (billedSeconds > 0) {
        const updated = await db.update(voiceUsage)
          .set({
            secondsUsed: sql`COALESCE(${voiceUsage.secondsUsed}, 0) + ${billedSeconds}`,
            updatedAt: new Date(),
          })
          .where(and(eq(voiceUsage.userId, userId), eq(voiceUsage.date, today)))
          .returning({ id: voiceUsage.id });
        if (updated.length === 0) {
          await db.insert(voiceUsage).values({ userId, date: today, secondsUsed: billedSeconds });
        }
      }

      const secondsRemaining = Math.max(0, DAILY_VOICE_LIMIT_SECONDS - currentUsage - billedSeconds);

      res.json({
        text: transcript,
        secondsRemaining,
        limitReached: secondsRemaining === 0,
        debug: { audioDuration, fileSize: audioBuffer.length, confidence }
      });
    } catch (error: any) {
      console.error("[VOICE] ERROR:", error?.message || error);
      res.status(500).json({ error: "Transcription failed. Try again." });
    } finally {
      if (audioFilePath) {
        fs.unlink(audioFilePath, () => {});
      }
    }
  });

  app.post("/api/tasks/extract", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
        return res.status(503).json({ error: "AI service not configured" });
      }

      const response = await fetch(OPENAI_CHAT_URL, {
        signal: AbortSignal.timeout(30_000),
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content: `Extract FUTURE to-do tasks only. Ignore everything else.

A TO-DO TASK is something the user NEEDS TO DO LATER - NOT what they're doing right now.

EXTRACT (future actions):
- "I need to call mom" → Call mom
- "Pick up groceries" → Pick up groceries  
- "Email the landlord about the lease" → Email landlord about lease
- "Schedule a dentist appointment" → Schedule dentist appointment

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
"So since Dawn is still up I can still talk and I'm going to test the microphone" → {"tasks": []}
"I need to pick up Chinese food and call my mom" → {"tasks": [{"title": "Pick up Chinese food"}, {"title": "Call mom"}]}
"Ok I'm gonna say a few random things then try to add a new user" → {"tasks": []}
"Remind me to buy milk and schedule car service" → {"tasks": [{"title": "Buy milk"}, {"title": "Schedule car service"}]}`
            },
            {
              role: "user",
              content: transcript.slice(0, 8000)
            }
          ],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" }
        }),
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
        const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
        res.json({
          tasks: tasks
            .filter((t: any) => t && typeof t.title === "string" && t.title.trim().length > 0)
            .map((t: any) => ({ title: t.title.trim().slice(0, 500) })),
        });
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", content);
        res.json({ tasks: [] });
      }
    } catch (error: any) {
      console.error("Task extraction error:", error);
      res.status(500).json({ error: "Failed to extract tasks" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
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
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      const result = await db.insert(users).values({
        email: normalizedEmail,
        passwordHash,
      }).returning();
      
      const user = result[0];
      
      await db.insert(userStats).values({
        userId: user.id,
      });
      
      const token = generateToken({ userId: user.id, email: normalizedEmail });
      
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      fetch("https://prime-task-control.replit.app/api/webhooks/igetitdone-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.PRIME_WEBHOOK_SECRET}`,
        },
        body: JSON.stringify({
          name: null,
          email: normalizedEmail,
          phone: null,
          variant: "ios",
          externalUserId: user.id,
        }),
      }).catch((e) => console.error("PRIME webhook failed:", e));

      if (typeof referralCode === "string" && referralCode.trim().length > 0) {
        const sendReferral = async (attempt: number): Promise<void> => {
          try {
            const response = await fetch("https://ambassador-plus.replit.app/api/track/referral", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                appSlug: "i-get-it-done-",
                referralCode: referralCode.trim(),
                referredUserId: user.id,
                sourceUrl: typeof referralSourceUrl === "string" && referralSourceUrl.length > 0 ? referralSourceUrl : undefined,
              }),
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
        sendReferral(0).catch(() => {});
      }

      res.json({ 
        user: { 
          id: user.id, 
          email: normalizedEmail,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
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
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (existing.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const user = existing[0];
      
      if (!user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const token = generateToken({ userId: user.id, email: normalizedEmail });
      
      res.cookie("authToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          email: normalizedEmail,
          createdAt: user.createdAt,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie("authToken");
    res.json({ success: true });
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const existing = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);
      
      if (existing.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const user = existing[0];
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        }
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.userId;

      if (bodyNamesOtherUser(req, "userId")) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const policyError = passwordPolicyError(newPassword);
      if (policyError) {
        return res.status(400).json({ error: policyError });
      }
      
      const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (existing.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const user = existing[0];
      
      if (!user.passwordHash) {
        return res.status(400).json({ error: "Cannot change password for this account" });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      
      if (!validPassword) {
        // 400, not 401: the app treats any 401 as an expired login and signs out.
        return res.status(400).json({ error: "Current password is incorrect" });
      }
      
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (existing.length === 0) {
        return res.json({ success: true, message: "If an account exists with this email, you will receive a reset code" });
      }
      
      const user = existing[0];
      
      const resetCode = randomInt(100000, 1000000).toString();
      const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);
      
      await db.update(users).set({
        resetToken: resetCode,
        resetTokenExpiry: resetExpiry,
      }).where(eq(users.id, user.id));
      resetCodeFailures.delete(normalizedEmail);
      
      const apiKey = process.env.SENDGRID_API_KEY;
      if (!apiKey) {
        console.error("SENDGRID_API_KEY not configured");
        return res.status(500).json({ error: "Email service not configured" });
      }
      
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: normalizedEmail }],
            },
          ],
          from: { email: "info@simplenow.co", name: "I Get It Done" },
          subject: "I Get It Done - Password Reset Code",
          content: [
            {
              type: "text/plain",
              value: `Your password reset code is: ${resetCode}\n\nThis code expires in 15 minutes.\n\nIf you did not request this reset, please ignore this email.`,
            },
            {
              type: "text/html",
              value: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #FF3B30;">Password Reset Code</h2>
                <p>Your password reset code is:</p>
                <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #333; background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center;">${resetCode}</p>
                <p style="color: #666;">This code expires in 15 minutes.</p>
                <p style="color: #999; font-size: 12px;">If you did not request this reset, please ignore this email.</p>
              </div>`,
            },
          ],
        }),
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

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { email, code, newPassword } = req.body;
      
      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }
      
      const policyError = passwordPolicyError(newPassword);
      if (policyError) {
        return res.status(400).json({ error: policyError });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedCode = code.toString().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      
      if (existing.length === 0) {
        return res.status(400).json({ error: "Invalid reset code" });
      }
      
      const user = existing[0];
      
      if (!user.resetToken || user.resetToken !== normalizedCode) {
        const failures = (resetCodeFailures.get(normalizedEmail) || 0) + 1;
        if (user.resetToken && failures >= MAX_RESET_CODE_FAILURES) {
          resetCodeFailures.delete(normalizedEmail);
          await db.update(users).set({ resetToken: null, resetTokenExpiry: null }).where(eq(users.id, user.id));
          return res.status(400).json({ error: "Too many wrong codes. Please request a new code." });
        }
        resetCodeFailures.set(normalizedEmail, failures);
        return res.status(400).json({ error: "Invalid reset code" });
      }
      resetCodeFailures.delete(normalizedEmail);
      
      if (!user.resetTokenExpiry || new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ error: "Reset code has expired. Please request a new code." });
      }
      
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await db.update(users).set({
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiry: null,
      }).where(eq(users.id, user.id));
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.post("/api/support/contact", async (req: Request, res: Response) => {
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: "info@simplenow.co" }],
            },
          ],
          from: { email: "info@simplenow.co", name: "I Get It Done Support" },
          reply_to: { email: email, name: name },
          subject: `Support Request from ${name}`,
          content: [
            {
              type: "text/plain",
              value: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            },
            {
              type: "text/html",
              value: `<h2>Support Request</h2><p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><hr><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br>')}</p>`,
            },
          ],
        }),
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

  app.post("/api/users/init", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      
      let user = null;
      if (deviceId) {
        const existing = await db.select().from(users).where(eq(users.deviceId, deviceId)).limit(1);
        if (existing.length > 0) {
          user = existing[0];
        }
      }
      
      if (!user) {
        const result = await db.insert(users).values({
          deviceId: deviceId || null,
          email: null,
        }).returning();
        user = result[0];
        
        await db.insert(userStats).values({
          userId: user.id,
        });
      }
      
      res.json({ user: { id: user.id, deviceId: user.deviceId, createdAt: user.createdAt } });
    } catch (error) {
      console.error("User init error:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });

  app.get("/api/tasks/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
      
      const taskIds = userTasks.map(t => t.id);
      let taskSubtasks: any[] = [];
      let taskNotes: any[] = [];
      
      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray(delegationNotes.taskId, taskIds));
      }
      
      const tasksWithDetails = userTasks.map(task => ({
        ...task,
        subtasks: taskSubtasks.filter(st => st.taskId === task.id),
        delegationNotes: taskNotes.filter(n => n.taskId === task.id),
      }));
      
      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, userId, title, notes, lane, reminderType, dueDate, assignedTo } = req.body;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      if (lane !== undefined && !LANES.includes(lane)) {
        return res.status(400).json({ error: "Invalid lane" });
      }
      const parsedDueDate = parseOptionalDate(dueDate);
      if (parsedDueDate === "invalid") {
        return res.status(400).json({ error: "Invalid dueDate" });
      }

      // The app retries creates on network errors, so the same client id can
      // arrive twice. Treat a repeat as success instead of a key violation.
      if (typeof id === "string" && id) {
        const [existing] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
        if (existing) {
          if (existing.userId !== userId) {
            return res.status(409).json({ error: "Task id already in use" });
          }
          return res.json({ task: { ...existing, subtasks: [], delegationNotes: [] } });
        }
      }
      
      const taskValues: typeof tasks.$inferInsert = {
        userId,
        title: title.trim().slice(0, 500),
        notes: typeof notes === "string" && notes.trim() ? notes : null,
        lane: lane || "now",
        reminderType: REMINDER_TYPES.includes(reminderType) ? reminderType : "soft",
        dueDate: parsedDueDate ?? null,
        assignedTo: typeof assignedTo === "string" && assignedTo ? assignedTo.slice(0, 255) : null,
      };
      
      if (typeof id === "string" && id) {
        taskValues.id = id.slice(0, 255);
      }
      
      const result = await db.insert(tasks).values(taskValues).returning();
      
      await db.update(users)
        .set({ lifetimeTasksCreated: sql`COALESCE(${users.lifetimeTasksCreated}, 0) + 1` })
        .where(eq(users.id, userId));
      
      res.json({ task: { ...result[0], subtasks: [], delegationNotes: [] } });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const me = req.user!.userId;
      const body = req.body || {};
      
      const existingTask = await db.select().from(tasks).where(eq(tasks.id, id));
      
      if (existingTask.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (existingTask[0].userId !== me) {
        return res.status(403).json({ error: "Access denied" });
      }
      const current = existingTask[0];

      // Only these columns are client-editable. Anything else in the body
      // (userId, nudge bookkeeping, ids) is ignored.
      const updates: Partial<typeof tasks.$inferInsert> = {};

      if (body.title !== undefined) {
        if (typeof body.title !== "string" || !body.title.trim()) {
          return res.status(400).json({ error: "Title can't be empty" });
        }
        updates.title = body.title.trim().slice(0, 500);
      }
      if (body.notes !== undefined) {
        updates.notes = typeof body.notes === "string" && body.notes.trim() ? body.notes : null;
      }
      if (body.lane !== undefined) {
        if (!LANES.includes(body.lane)) return res.status(400).json({ error: "Invalid lane" });
        updates.lane = body.lane;
      }
      if (body.reminderType !== undefined) {
        if (!REMINDER_TYPES.includes(body.reminderType)) return res.status(400).json({ error: "Invalid reminder type" });
        updates.reminderType = body.reminderType;
      }
      if (body.isOverdue !== undefined) updates.isOverdue = !!body.isOverdue;
      if (body.focusTimeMinutes !== undefined) {
        const minutes = Number(body.focusTimeMinutes);
        if (!Number.isFinite(minutes) || minutes < 0) return res.status(400).json({ error: "Invalid focus time" });
        updates.focusTimeMinutes = Math.round(minutes);
      }
      if (body.assignedTo !== undefined) {
        updates.assignedTo = typeof body.assignedTo === "string" && body.assignedTo ? body.assignedTo.slice(0, 255) : null;
      }
      if (body.delegationStatus !== undefined) {
        if (body.delegationStatus !== null && !DELEGATION_STATUSES.includes(body.delegationStatus)) {
          return res.status(400).json({ error: "Invalid delegation status" });
        }
        updates.delegationStatus = body.delegationStatus;
      }
      for (const field of ["dueDate", "completedAt", "delegatedAt", "lastDelegationUpdate"] as const) {
        const parsed = parseOptionalDate(body[field]);
        if (parsed === "invalid") return res.status(400).json({ error: `Invalid ${field}` });
        if (parsed !== undefined) updates[field] = parsed;
      }

      // A new hand-off from an older App Store build names the teammate only by
      // nickname (see findTeammateByNickname). Without this the teammate's
      // "Assigned to Me" list never shows the task.
      let requestedDelegateId = body.delegatedToUserId;
      if (
        requestedDelegateId === undefined &&
        typeof updates.assignedTo === "string" &&
        updates.assignedTo !== current.assignedTo &&
        updates.delegationStatus === "assigned" &&
        !current.delegatedToUserId &&
        !current.completedAt &&
        !updates.completedAt
      ) {
        requestedDelegateId = (await findTeammateByNickname(me, updates.assignedTo)) ?? undefined;
      }

      let newDelegateId: string | null = null;
      if (requestedDelegateId !== undefined) {
        const target = requestedDelegateId || null;
        let validTarget = true;
        if (target && target !== current.delegatedToUserId) {
          validTarget = target !== me && (await areTeammates(me, target));
          if (validTarget) {
            newDelegateId = target;
            if (!updates.delegatedAt) updates.delegatedAt = new Date();
            if (updates.delegationStatus === undefined) updates.delegationStatus = "assigned";
          }
        }
        if (validTarget) {
          updates.delegatedToUserId = target;
        } else {
          // App Store builds save the whole task, including a hand-off they
          // still hold in memory after the teammate was unlinked. Don't lose
          // that save (e.g. a completion): drop the stale hand-off fields and
          // keep the rest. A request that is only a hand-off gets an error.
          const otherFields = Object.keys(body).filter(
            (k) => !["delegatedToUserId", "delegationStatus", "assignedTo", "delegatedAt", "lastDelegationUpdate"].includes(k)
          );
          if (otherFields.length === 0) {
            return res.status(400).json({ error: "You can only hand off tasks to linked team members" });
          }
          delete updates.delegationStatus;
          delete updates.assignedTo;
          delete updates.delegatedAt;
          delete updates.lastDelegationUpdate;
        }
      }

      // While a teammate holds the task, its status belongs to them. App Store
      // builds send the whole task on every save, including the status they
      // loaded earlier, which would silently undo the teammate's update. A
      // full save (it carries the title) only changes the hand-off when it
      // names a new teammate.
      const isFullSave = body.title !== undefined;
      if (isFullSave && current.delegatedToUserId && !newDelegateId && updates.delegatedToUserId !== null) {
        delete updates.delegationStatus;
        delete updates.lastDelegationUpdate;
        delete updates.delegatedAt;
        delete updates.assignedTo;
        delete updates.delegatedToUserId;
      }

      const isBeingCompleted = !!updates.completedAt && current.completedAt === null;

      if (Object.keys(updates).length === 0) {
        return res.json({ task: current });
      }
      
      // When completing, only the request that actually flips completedAt from
      // null applies points, so a double tap or a notification "Done" racing
      // the app can't count twice.
      let result = await db.update(tasks).set(updates)
        .where(isBeingCompleted ? and(eq(tasks.id, id), isNull(tasks.completedAt)) : eq(tasks.id, id))
        .returning();
      if (result.length === 0) {
        delete updates.completedAt;
        result = Object.keys(updates).length > 0
          ? await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning()
          : await db.select().from(tasks).where(eq(tasks.id, id));
      } else if (isBeingCompleted) {
        await applyCompletionStats(me);
      }

      if (newDelegateId) {
        const [owner] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, me)).limit(1);
        sendDelegationNotification(newDelegateId, result[0].title, displayNameFor(owner), result[0].id)
          .catch((err) => console.error("Delegation notification failed:", err));
      }
      
      res.json({ task: result[0] });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.post("/api/tasks/:id/snooze", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const existingTask = await db.select().from(tasks).where(eq(tasks.id, id));

      if (existingTask.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (existingTask[0].userId !== req.user?.userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Bump lastNudgeAt one hour into the future so the nudge engine's
      // interval check waits at least an extra hour before the next nudge.
      const snoozedUntilBase = new Date(Date.now() + 60 * 60 * 1000);
      const result = await db
        .update(tasks)
        .set({ lastNudgeAt: snoozedUntilBase })
        .where(eq(tasks.id, id))
        .returning();

      res.json(result[0]);
    } catch (error) {
      console.error("Snooze task error:", error);
      res.status(500).json({ error: "Failed to snooze task" });
    }
  });

  app.delete("/api/tasks/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      const existingTask = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      if (existingTask.length > 0 && existingTask[0].userId !== req.user?.userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await db.delete(tasks).where(eq(tasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // Subtasks can only be changed by the owner of the parent task.
  async function ownsTask(userId: string, taskId: unknown): Promise<"ok" | "missing" | "forbidden"> {
    if (typeof taskId !== "string" || !taskId) return "missing";
    const [task] = await db.select({ userId: tasks.userId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return "missing";
    return task.userId === userId ? "ok" : "forbidden";
  }

  async function findOwnSubtask(req: AuthenticatedRequest) {
    const [row] = await db
      .select({ subtask: subtasks, ownerId: tasks.userId })
      .from(subtasks)
      .innerJoin(tasks, eq(tasks.id, subtasks.taskId))
      .where(eq(subtasks.id, req.params.id))
      .limit(1);
    if (!row || row.ownerId !== req.user!.userId) return null;
    return row.subtask;
  }

  app.post("/api/subtasks", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, taskId, title } = req.body;

      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
      }
      const ownership = await ownsTask(req.user!.userId, taskId);
      if (ownership === "missing") return res.status(404).json({ error: "Task not found" });
      if (ownership === "forbidden") return res.status(403).json({ error: "Access denied" });
      
      const subtaskValues: typeof subtasks.$inferInsert = {
        taskId,
        title: title.trim().slice(0, 500),
        completed: false,
      };
      
      if (typeof id === "string" && id) {
        const [existing] = await db.select().from(subtasks).where(eq(subtasks.id, id)).limit(1);
        if (existing) {
          if (existing.taskId !== taskId) return res.status(409).json({ error: "Subtask id already in use" });
          return res.json({ subtask: existing });
        }
        subtaskValues.id = id.slice(0, 255);
      }
      
      const result = await db.insert(subtasks).values(subtaskValues).returning();
      
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Create subtask error:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  app.put("/api/subtasks/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const subtask = await findOwnSubtask(req);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      const { completed, title } = req.body;
      
      const updates: Partial<typeof subtasks.$inferInsert> = {};
      if (completed !== undefined) updates.completed = !!completed;
      if (title !== undefined) {
        if (typeof title !== "string" || !title.trim()) {
          return res.status(400).json({ error: "Title can't be empty" });
        }
        updates.title = title.trim().slice(0, 500);
      }
      if (Object.keys(updates).length === 0) {
        return res.json({ subtask });
      }
      
      const result = await db.update(subtasks).set(updates).where(eq(subtasks.id, subtask.id)).returning();
      
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.delete("/api/subtasks/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const subtask = await findOwnSubtask(req);
      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }
      await db.delete(subtasks).where(eq(subtasks.id, subtask.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  app.get("/api/contacts/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const userContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));
      res.json({ contacts: userContacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, userId, name, role, color } = req.body;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const contactValues: typeof contacts.$inferInsert = {
        userId,
        name: name.trim().slice(0, 255),
        role: typeof role === "string" && role.trim() ? role.trim().slice(0, 255) : null,
        color: typeof color === "string" && color ? color.slice(0, 20) : "#007AFF",
      };

      // The app saves edits by re-posting the same contact id: update in place.
      if (typeof id === "string" && id) {
        const [existing] = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
        if (existing) {
          if (existing.userId !== userId) {
            return res.status(403).json({ error: "Access denied" });
          }
          const [updated] = await db.update(contacts)
            .set({ name: contactValues.name, role: contactValues.role, color: contactValues.color })
            .where(eq(contacts.id, id))
            .returning();
          return res.json({ contact: updated });
        }
        contactValues.id = id.slice(0, 255);
      }
      
      const result = await db.insert(contacts).values(contactValues).returning();
      
      res.json({ contact: result[0] });
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const me = req.user!.userId;
      const [contact] = await db.select({ userId: contacts.userId }).from(contacts).where(eq(contacts.id, id)).limit(1);
      if (!contact || contact.userId !== me) {
        return res.status(404).json({ error: "Contact not found" });
      }
      await db.transaction(async (tx) => {
        // Tasks handed to this contact go back to being unassigned.
        await tx.update(tasks)
          .set({ assignedTo: null, delegationStatus: null, delegatedAt: null, lastDelegationUpdate: null })
          .where(and(eq(tasks.userId, me), eq(tasks.assignedTo, id)));
        await tx.delete(contacts).where(eq(contacts.id, id));
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.put("/api/users/:id/push-token", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { pushToken, notificationsEnabled, timezoneOffsetMinutes } = req.body;
      
      const updates: any = {};
      if (pushToken !== undefined) {
        if (pushToken !== null && typeof pushToken !== "string") {
          return res.status(400).json({ error: "Invalid push token" });
        }
        updates.pushToken = pushToken || null;
        if (pushToken) {
          // A phone that switches accounts must stop getting the old account's reminders.
          await db.update(users)
            .set({ pushToken: null })
            .where(and(eq(users.pushToken, pushToken), sql`${users.id} <> ${id}`));
        }
      }
      if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
      if (Number.isInteger(timezoneOffsetMinutes) && Math.abs(timezoneOffsetMinutes) <= 14 * 60) {
        updates.timezoneOffsetMinutes = timezoneOffsetMinutes;
      }
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
      }

      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning({
        id: users.id,
        pushToken: users.pushToken,
        notificationsEnabled: users.notificationsEnabled,
        timezoneOffsetMinutes: users.timezoneOffsetMinutes,
      });
      
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ user: result[0] });
    } catch (error) {
      console.error("Update push token error:", error);
      res.status(500).json({ error: "Failed to update push token" });
    }
  });

  // ---- Web Push (browser notifications) ----
  app.get("/api/web-push/vapid-public-key", async (_req: Request, res: Response) => {
    try {
      const keys = await getVapidKeys();
      res.json({ publicKey: keys.publicKey });
    } catch (error) {
      console.error("VAPID public key error:", error);
      res.status(500).json({ error: "Failed to get VAPID public key" });
    }
  });

  app.post("/api/users/:id/web-push-subscriptions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { subscription, timezoneOffsetMinutes, resync } = req.body;
      if (
        !subscription?.endpoint ||
        typeof subscription.endpoint !== "string" ||
        !subscription.keys?.p256dh ||
        !subscription.keys?.auth
      ) {
        return res.status(400).json({ error: "Invalid subscription" });
      }

      await saveWebPushSubscription(id, subscription);

      // An app-start re-sync only refreshes the subscription. Turning the
      // account's notifications back on is reserved for an explicit opt-in.
      const updates: any = resync === true ? {} : { notificationsEnabled: true };
      if (Number.isInteger(timezoneOffsetMinutes) && Math.abs(timezoneOffsetMinutes) <= 14 * 60) {
        updates.timezoneOffsetMinutes = timezoneOffsetMinutes;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, id));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Save web push subscription error:", error);
      res.status(500).json({ error: "Failed to save subscription" });
    }
  });

  app.delete("/api/users/:id/web-push-subscriptions", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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

  app.get("/api/users/:id/notification-prefs", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const result = await db
        .select({
          notificationsEnabled: users.notificationsEnabled,
          notificationIntensity: users.notificationIntensity,
          escalatingRemindersEnabled: users.escalatingRemindersEnabled,
          morningKickoffEnabled: users.morningKickoffEnabled,
          eveningCheckinEnabled: users.eveningCheckinEnabled,
          streakSaverEnabled: users.streakSaverEnabled,
          morningKickoffHour: users.morningKickoffHour,
          eveningCheckinHour: users.eveningCheckinHour,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ prefs: result[0] });
    } catch (error) {
      console.error("Get notification prefs error:", error);
      res.status(500).json({ error: "Failed to get notification preferences" });
    }
  });

  app.put("/api/users/:id/notification-prefs", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
        timezoneOffsetMinutes,
      } = req.body;

      const updates: Record<string, unknown> = {};
      if (notificationIntensity !== undefined) {
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

      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning({ id: users.id });
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update notification prefs error:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  app.get("/api/stats/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const stats = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
      
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

  app.put("/api/stats/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updates = req.body;
      
      delete updates.id;
      delete updates.userId;
      
      if (updates.lastActiveDate) updates.lastActiveDate = updates.lastActiveDate;
      
      const result = await db.update(userStats).set(updates).where(eq(userStats.userId, userId)).returning();
      
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

  app.post("/api/sync", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, tasks: clientTasks, contacts: clientContacts, stats: clientStats } = req.body;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      for (const task of clientTasks || []) {
        const existing = await db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
        
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
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            assignedTo: task.assignedTo || null,
            delegationStatus: task.delegationStatus || null,
            delegatedAt: task.delegatedAt ? new Date(task.delegatedAt) : null,
            lastDelegationUpdate: task.lastDelegationUpdate ? new Date(task.lastDelegationUpdate) : null,
          });
          
          for (const st of task.subtasks || []) {
            await db.insert(subtasks).values({
              id: st.id,
              taskId: task.id,
              title: st.title,
              completed: st.completed || false,
            }).onConflictDoNothing();
          }
          
          for (const note of task.delegationNotes || []) {
            await db.insert(delegationNotes).values({
              id: note.id,
              taskId: task.id,
              type: note.type,
              text: note.text || null,
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            }).onConflictDoNothing();
          }
        }
      }
      
      for (const contact of clientContacts || []) {
        const existing = await db.select().from(contacts).where(eq(contacts.id, contact.id)).limit(1);
        
        if (existing.length === 0) {
          await db.insert(contacts).values({
            id: contact.id,
            userId,
            name: contact.name,
            role: contact.role || null,
            color: contact.color || "#007AFF",
            createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
          });
        }
      }
      
      if (clientStats) {
        delete clientStats.id;
        delete clientStats.userId;
        await db.insert(userStats).values({
          userId,
          ...clientStats,
          lastActiveDate: clientStats.lastActiveDate || null,
        }).onConflictDoUpdate({
          target: userStats.userId,
          set: clientStats,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  app.put("/api/users/:id/display-name", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const { displayName } = req.body;
      if (displayName !== null && typeof displayName !== "string") {
        return res.status(400).json({ error: "displayName must be a string" });
      }
      const cleaned = typeof displayName === "string" ? displayName.trim().slice(0, 100) || null : null;

      const result = await db.update(users).set({ displayName: cleaned }).where(eq(users.id, id)).returning();

      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ user: { id: result[0].id, email: result[0].email, displayName: result[0].displayName } });
    } catch (error) {
      console.error("Update display name error:", error);
      res.status(500).json({ error: "Failed to update display name" });
    }
  });

  app.post("/api/team/invite", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (bodyNamesOtherUser(req, "inviterId")) {
        return res.status(403).json({ error: "Access denied" });
      }
      const inviterId = req.user!.userId;

      const inviteeEmail = normalizeEmail(req.body.inviteeEmail);
      if (inviteeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }
      if (inviteeEmail && inviteeEmail === req.user!.email?.toLowerCase()) {
        return res.status(400).json({ error: "You can't invite yourself" });
      }

      const inviteCode = await generateUniqueInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const result = await db.insert(teamInvites).values({
        inviteCode,
        inviterId,
        inviteeEmail,
        status: "pending",
        expiresAt,
      }).returning();

      res.json({ invite: result[0] });
    } catch (error) {
      console.error("Create invite error:", error);
      res.status(500).json({ error: "Failed to create invite" });
    }
  });

  app.get("/api/team/invites/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const now = new Date();

      const sentInvites = await db.select().from(teamInvites).where(
        and(eq(teamInvites.inviterId, userId), eq(teamInvites.status, "pending"))
      );

      const userRecord = await db.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
      const userEmail = userRecord[0]?.email?.toLowerCase();

      let receivedInvites: any[] = [];
      if (userEmail) {
        const rows = await db
          .select({ invite: teamInvites, inviterEmail: users.email, inviterName: users.displayName })
          .from(teamInvites)
          .innerJoin(users, eq(users.id, teamInvites.inviterId))
          .where(and(
            sql`lower(${teamInvites.inviteeEmail}) = ${userEmail}`,
            eq(teamInvites.status, "pending"),
          ));
        receivedInvites = rows
          .filter((row) => !row.invite.expiresAt || row.invite.expiresAt > now)
          .map((row) => ({ ...row.invite, inviterEmail: row.inviterEmail, inviterName: row.inviterName }));
      }

      res.json({ sentInvites, receivedInvites });
    } catch (error) {
      console.error("Get invites error:", error);
      res.status(500).json({ error: "Failed to get invites" });
    }
  });

  app.post("/api/team/invite/accept", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (bodyNamesOtherUser(req, "userId")) {
        return res.status(403).json({ error: "Access denied" });
      }
      const userId = req.user!.userId;
      const inviteCode = typeof req.body.inviteCode === "string" ? req.body.inviteCode.trim().toUpperCase() : "";
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }

      const inviteResult = await db.select().from(teamInvites).where(eq(teamInvites.inviteCode, inviteCode)).limit(1);

      if (inviteResult.length === 0) {
        return res.status(404).json({ error: "Invite not found. Check the code and try again." });
      }

      const invite = inviteResult[0];

      if (invite.status !== "pending") {
        return res.status(400).json({ error: "Invite is no longer valid" });
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ error: "Invite has expired. Ask for a new code." });
      }

      if (!invite.inviterId) {
        return res.status(400).json({ error: "Invite is no longer valid" });
      }
      const inviterId = invite.inviterId;

      if (inviterId === userId) {
        return res.status(400).json({ error: "Can't join your own team" });
      }

      const colors = ["#FF3B30", "#FF9500", "#007AFF", "#AF52DE", "#34C759", "#5856D6"];
      const pickColor = () => colors[randomInt(colors.length)];

      const [inviterUser] = await db.select().from(users).where(eq(users.id, inviterId)).limit(1);
      const [acceptingUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!inviterUser || !acceptingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Both directions must exist for delegation to work either way. Create
      // whichever side is missing (one side can be left over from an earlier link).
      const teamMember = await db.transaction(async (tx) => {
        const existing = await tx.select().from(teamMembers).where(
          or(
            and(eq(teamMembers.userId, inviterId), eq(teamMembers.teammateId, userId)),
            and(eq(teamMembers.userId, userId), eq(teamMembers.teammateId, inviterId))
          )
        );
        const inviterSide = existing.find((m) => m.userId === inviterId);
        let mySide = existing.find((m) => m.userId === userId);

        if (!inviterSide) {
          await tx.insert(teamMembers).values({
            userId: inviterId,
            teammateId: userId,
            nickname: displayNameFor(acceptingUser),
            color: pickColor(),
          });
        }
        if (!mySide) {
          [mySide] = await tx.insert(teamMembers).values({
            userId,
            teammateId: inviterId,
            nickname: displayNameFor(inviterUser),
            color: pickColor(),
          }).returning();
        }

        await tx.update(teamInvites).set({ status: "accepted" }).where(eq(teamInvites.id, invite.id));
        return mySide;
      });

      res.json({ teamMember });
    } catch (error) {
      console.error("Accept invite error:", error);
      res.status(500).json({ error: "Failed to accept invite" });
    }
  });

  app.post("/api/team/invite/decline", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { inviteId } = req.body;
      if (typeof inviteId !== "string" || !inviteId) {
        return res.status(400).json({ error: "inviteId is required" });
      }

      const myEmail = req.user!.email?.toLowerCase();
      const [invite] = await db.select().from(teamInvites).where(eq(teamInvites.id, inviteId)).limit(1);
      if (!invite || !myEmail || invite.inviteeEmail?.toLowerCase() !== myEmail) {
        return res.status(404).json({ error: "Invite not found" });
      }

      await db.update(teamInvites).set({ status: "declined" }).where(eq(teamInvites.id, inviteId));

      res.json({ success: true });
    } catch (error) {
      console.error("Decline invite error:", error);
      res.status(500).json({ error: "Failed to decline invite" });
    }
  });

  // Loads an invite only if the authenticated user created it.
  async function findOwnInvite(req: AuthenticatedRequest) {
    const [invite] = await db.select().from(teamInvites).where(eq(teamInvites.id, req.params.id)).limit(1);
    if (!invite || invite.inviterId !== req.user!.userId) return null;
    return invite;
  }

  app.delete("/api/team/invite/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invite = await findOwnInvite(req);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      await db.delete(teamInvites).where(eq(teamInvites.id, invite.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Cancel invite error:", error);
      res.status(500).json({ error: "Failed to cancel invite" });
    }
  });

  app.post("/api/team/invite/:id/resend", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invite = await findOwnInvite(req);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      // Re-sharing a code should give the recipient a full week to use it.
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      const [updated] = await db.update(teamInvites)
        .set({ expiresAt: newExpiry, status: "pending" })
        .where(eq(teamInvites.id, invite.id))
        .returning();

      res.json({ invite: updated });
    } catch (error) {
      console.error("Resend invite error:", error);
      res.status(500).json({ error: "Failed to resend invite" });
    }
  });

  app.post("/api/team/invite/:id/regenerate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const invite = await findOwnInvite(req);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      const newCode = await generateUniqueInviteCode();
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);

      const updated = await db.update(teamInvites)
        .set({
          inviteCode: newCode,
          expiresAt: newExpiry,
          status: "pending"
        })
        .where(eq(teamInvites.id, invite.id))
        .returning();

      res.json({ invite: updated[0] });
    } catch (error) {
      console.error("Regenerate invite error:", error);
      res.status(500).json({ error: "Failed to regenerate invite" });
    }
  });

  app.get("/api/team/members/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const rows = await db
        .select({ member: teamMembers, email: users.email, displayName: users.displayName })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.teammateId))
        .where(eq(teamMembers.userId, userId));

      const membersWithDetails = rows.map((row) => ({
        ...row.member,
        teammateEmail: row.email,
        teammateName: row.displayName || row.email?.split("@")[0],
      }));

      res.json({ members: membersWithDetails });
    } catch (error) {
      console.error("Get team members error:", error);
      res.status(500).json({ error: "Failed to get team members" });
    }
  });

  app.delete("/api/team/members/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const me = req.user!.userId;

      const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id)).limit(1);
      if (!member || member.userId !== me || !member.teammateId) {
        return res.status(404).json({ error: "Team member not found" });
      }
      const them = member.teammateId;

      // Unlinking is mutual, and open hand-offs between the two people end with it.
      await db.transaction(async (tx) => {
        await tx.delete(teamMembers).where(
          or(
            and(eq(teamMembers.userId, me), eq(teamMembers.teammateId, them)),
            and(eq(teamMembers.userId, them), eq(teamMembers.teammateId, me))
          )
        );
        await tx.update(tasks).set(CLEARED_DELEGATION).where(
          and(
            isNull(tasks.completedAt),
            or(
              and(eq(tasks.userId, me), eq(tasks.delegatedToUserId, them)),
              and(eq(tasks.userId, them), eq(tasks.delegatedToUserId, me))
            )
          )
        );
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Remove team member error:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  app.get("/api/delegated-to-me/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const rows = await db
        .select({ task: tasks, ownerEmail: users.email, ownerDisplayName: users.displayName })
        .from(tasks)
        .innerJoin(users, eq(users.id, tasks.userId))
        .where(and(eq(tasks.delegatedToUserId, userId), isNull(tasks.completedAt)));

      const taskIds = rows.map((row) => row.task.id);
      let taskSubtasks: any[] = [];
      let taskNotes: any[] = [];

      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray(delegationNotes.taskId, taskIds));
      }

      const tasksWithDetails = rows.map(({ task, ownerEmail, ownerDisplayName }) => ({
        ...task,
        subtasks: taskSubtasks.filter((s) => s.taskId === task.id),
        delegationNotes: taskNotes
          .filter((n) => n.taskId === task.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        ownerName: ownerDisplayName || ownerEmail?.split("@")[0] || "Unknown",
        ownerEmail,
      }));

      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get delegated tasks error:", error);
      res.status(500).json({ error: "Failed to get delegated tasks" });
    }
  });

  app.put("/api/delegation-status/:taskId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { taskId } = req.params;
      const { status, note } = req.body;
      const me = req.user!.userId;

      if (bodyNamesOtherUser(req, "userId")) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }
      if (!DELEGATION_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const task = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

      if (task.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task[0].delegatedToUserId !== me) {
        return res.status(403).json({ error: "Not authorized to update this task" });
      }

      const result = await db.update(tasks).set({
        delegationStatus: status,
        lastDelegationUpdate: new Date(),
      }).where(eq(tasks.id, taskId)).returning();

      const noteText = typeof note === "string" ? note.trim().slice(0, 2000) : "";
      let savedNote = null;
      if (noteText) {
        [savedNote] = await db.insert(delegationNotes).values({
          taskId,
          authorId: me,
          type: "status_update",
          text: noteText,
        }).returning();
      }

      if (task[0].userId && task[0].delegationStatus !== status) {
        const [delegate] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, me)).limit(1);
        sendDelegationStatusNotification(
          task[0].userId,
          task[0].id,
          task[0].title,
          displayNameFor(delegate),
          DELEGATION_STATUS_LABELS[status],
          noteText || undefined,
        ).catch((err) => console.error("Delegation status notification failed:", err));
      }

      res.json({ task: result[0], note: savedNote });
    } catch (error) {
      console.error("Update delegation status error:", error);
      res.status(500).json({ error: "Failed to update delegation status" });
    }
  });

  app.post("/api/delegation-notes", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id, taskId, type, text } = req.body;
      const me = req.user!.userId;

      if (bodyNamesOtherUser(req, "authorId")) {
        return res.status(403).json({ error: "Access denied" });
      }
      if (typeof taskId !== "string" || !DELEGATION_NOTE_TYPES.includes(type)) {
        return res.status(400).json({ error: "taskId and a valid type are required" });
      }

      const [task] = await db.select({ userId: tasks.userId, delegatedToUserId: tasks.delegatedToUserId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      if (task.userId !== me && task.delegatedToUserId !== me) {
        return res.status(403).json({ error: "Access denied" });
      }

      const values: typeof delegationNotes.$inferInsert = {
        taskId,
        authorId: me,
        type,
        text: typeof text === "string" ? text.trim().slice(0, 2000) || null : null,
      };
      if (typeof id === "string" && id.length > 0 && id.length <= 255) {
        values.id = id;
      }

      const result = await db.insert(delegationNotes).values(values).onConflictDoNothing().returning();
      await db.update(tasks).set({ lastDelegationUpdate: new Date() }).where(eq(tasks.id, taskId));

      res.json({ note: result[0] ?? null });
    } catch (error) {
      console.error("Create delegation note error:", error);
      res.status(500).json({ error: "Failed to create delegation note" });
    }
  });

  app.delete("/api/account/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { password } = req.body;
      
      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const userResult = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      if (userResult.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const user = userResult[0];
      
      if (user.passwordHash && password) {
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid password" });
        }
      } else if (user.passwordHash && !password) {
        return res.status(400).json({ error: "Password is required to delete account" });
      }
      
      await db.transaction(async (tx) => {
        // Tasks other people handed to this user point at them without a
        // cascade, so release those hand-offs first or the user row can't go.
        await tx.update(tasks).set(CLEARED_DELEGATION).where(eq(tasks.delegatedToUserId, userId));
        await tx.delete(delegationNotes).where(eq(delegationNotes.authorId, userId));
        await tx.delete(subtasks).where(
          inArray(subtasks.taskId,
            tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId))
          )
        );
        await tx.delete(tasks).where(eq(tasks.userId, userId));
        await tx.delete(contacts).where(eq(contacts.userId, userId));
        await tx.delete(teamMembers).where(
          or(eq(teamMembers.userId, userId), eq(teamMembers.teammateId, userId))
        );
        await tx.delete(teamInvites).where(eq(teamInvites.inviterId, userId));
        await tx.delete(userStats).where(eq(userStats.userId, userId));
        await tx.delete(users).where(eq(users.id, userId));
      });
      
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/subscription/:userId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      if (!req.user || req.user.userId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRecord.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userRecord[0];
      const status = user.subscriptionStatus || "none";
      const trialEndsAt = user.trialEndsAt ? user.trialEndsAt.toISOString() : null;

      const OWNER_EMAILS = ["troyevansspeaks@gmail.com"];
      const isOwner = !!user.email && OWNER_EMAILS.includes(user.email.toLowerCase());

      const isTrialing = status === "trialing" && trialEndsAt && new Date(trialEndsAt) > new Date();
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
          freeTasksRemaining: freeTrialActive ? 10 - lifetimeTasksCreated : 0,
        },
      });
    } catch (error) {
      console.error("Get subscription error:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  app.post("/api/webhooks/revenuecat", async (req: Request, res: Response) => {
    try {
      const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
      if (webhookSecret) {
        const authHeader = req.headers["authorization"] || "";
        const stripBearer = (val: string) => val.trim().replace(/^Bearer\s+/i, "");
        const headerValue = stripBearer(authHeader);
        const secretValue = stripBearer(webhookSecret);
        if (!headerValue || headerValue !== secretValue) {
          console.error("[RevenueCat Webhook] Auth failed");
          return res.status(401).json({ error: "Unauthorized" });
        }
      } else if (process.env.NODE_ENV === "production") {
        // Without the secret anyone could grant themselves Pro with one POST.
        console.error("[RevenueCat Webhook] REVENUECAT_WEBHOOK_SECRET is not set; rejecting webhook");
        return res.status(503).json({ error: "Webhook not configured" });
      }

      const { event } = req.body;
      if (!event) {
        console.error("[RevenueCat Webhook] No event in payload");
        return res.status(200).json({ received: true });
      }

      const {
        type,
        app_user_id,
        expiration_at_ms,
        period_type,
      } = event;

      console.log(`[RevenueCat Webhook] Event: ${type}, User: ${app_user_id}`);

      if (type === "TEST") {
        console.log(`[RevenueCat Webhook] Test event received successfully`);
        return res.status(200).json({ received: true });
      }

      if (type === "TRANSFER") {
        // A restore moved the purchase to another account: the old ids lose it,
        // the new one gains it.
        const fromIds: string[] = Array.isArray(event.transferred_from) ? event.transferred_from : [];
        const toIds: string[] = Array.isArray(event.transferred_to) ? event.transferred_to : [];
        if (fromIds.length > 0) {
          await db.update(users).set({ subscriptionStatus: "none", trialEndsAt: null }).where(inArray(users.id, fromIds));
        }
        // A transfer carries no entitlement state (an expired receipt can be
        // transferred too), so it never grants Pro here. The new owner's app
        // reads the entitlement from RevenueCat directly, and the next
        // RENEWAL/EXPIRATION event updates the server.
        console.log(`[RevenueCat Webhook] Transfer from ${fromIds.length} to ${toIds.length} account(s)`);
        return res.status(200).json({ received: true });
      }

      if (!app_user_id) {
        console.error("[RevenueCat Webhook] No app_user_id in event");
        return res.status(200).json({ received: true });
      }

      const userRecord = await db.select().from(users).where(eq(users.id, app_user_id)).limit(1);
      if (userRecord.length === 0) {
        // Anonymous RevenueCat ids ($RCAnonymousID...) never match a user row.
        console.error(`[RevenueCat Webhook] User not found: ${app_user_id}`);
        return res.status(200).json({ received: true });
      }

      let newStatus: string = userRecord[0].subscriptionStatus || "none";
      let trialEndsAt: Date | null = userRecord[0].trialEndsAt || null;

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
          // Auto-renew was turned off. The user keeps what they paid for until
          // RevenueCat sends EXPIRATION, so access does not change here.
          console.log(`[RevenueCat Webhook] Cancellation noted for ${app_user_id}; access continues until expiration`);
          return res.status(200).json({ received: true });

        case "EXPIRATION":
          newStatus = "none";
          trialEndsAt = null;
          break;

        case "BILLING_ISSUE":
          newStatus = "past_due";
          break;

        case "PRODUCT_CHANGE":
        case "NON_RENEWING_PURCHASE":
          newStatus = "active";
          break;

        default:
          console.log(`[RevenueCat Webhook] Unhandled event type: ${type}`);
          return res.status(200).json({ received: true });
      }

      await db.update(users).set({
        subscriptionStatus: newStatus,
        trialEndsAt,
      }).where(eq(users.id, app_user_id));

      console.log(`[RevenueCat Webhook] Updated user ${app_user_id}: status=${newStatus}`);
      // Acknowledge only after the write, so RevenueCat retries if it failed.
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("[RevenueCat Webhook] Processing error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Processing failed" });
    }
  });

  app.post("/api/errors/report", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, platform, appVersion, timestamp } = req.body;
      
      if (!message || typeof message !== "string" || message.length > 5000) {
        return res.status(400).json({ error: "Invalid error report" });
      }
      
      console.error("[Client Error]", {
        message: message.substring(0, 500),
        platform: String(platform || "unknown").substring(0, 20),
        appVersion: String(appVersion || "unknown").substring(0, 20),
        timestamp: String(timestamp || "").substring(0, 30),
        authenticated: !!req.user,
      });
      
      res.json({ received: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  app.get("/api/users/:id/notification-settings", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!req.user || req.user.userId !== id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const [user] = await db.select({
        pushToken: users.pushToken,
        notificationsEnabled: users.notificationsEnabled,
      }).from(users).where(eq(users.id, id)).limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const webSubs = await db
        .select({ id: webPushSubscriptions.id })
        .from(webPushSubscriptions)
        .where(eq(webPushSubscriptions.userId, id))
        .limit(1);

      res.json({
        notificationsEnabled: user.notificationsEnabled || false,
        hasPushToken: !!user.pushToken,
        hasWebPushSubscription: webSubs.length > 0,
      });
    } catch (error) {
      console.error("Get notification settings error:", error);
      res.status(500).json({ error: "Failed to get notification settings" });
    }
  });

  app.post("/api/notifications/test", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);

      const webSent = await sendWebPushNotifications([
        {
          userId: req.user.userId,
          title: "I GET IT DONE",
          body: "Browser notifications are working! You'll receive task reminders here.",
          data: { type: "test" },
        },
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

  // ---- Dev-only: fire each nudge type on demand for the authenticated user ----
  if (process.env.NODE_ENV !== "production") {
    // POST /api/notifications/test/escalating
    // Sends an escalating nudge for the caller's first incomplete task (with action buttons).
    app.post("/api/notifications/test/escalating", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq(users.id, req.user.userId)).limit(1);
        if (!user?.pushToken) return res.status(400).json({ error: "No push token registered" });
        const [task] = await db.select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(and(eq(tasks.userId, req.user.userId), isNull(tasks.completedAt)))
          .limit(1);
        const taskId = task?.id ?? "test-task";
        const taskTitle = task?.title ?? "Your first task";
        const t = taskTitle.length > 60 ? taskTitle.slice(0, 57) + "..." : taskTitle;
        const result = await sendBulkPushNotifications([{
          token: user.pushToken,
          title: "Still on your plate",
          body: `"${t}" hasn't moved. Want to knock it out right now? Tap to start a focus timer.`,
          data: { type: "escalating_nudge", taskId },
          categoryId: "task_nudge",
        }]);
        res.json({ success: result.sent > 0, taskId, taskTitle });
      } catch (err) {
        console.error("Dev escalating nudge error:", err);
        res.status(500).json({ error: "Failed to send test escalating nudge" });
      }
    });

    // POST /api/notifications/test/morning-kickoff
    // Sends a morning kickoff notification for the caller.
    app.post("/api/notifications/test/morning-kickoff", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq(users.id, req.user.userId)).limit(1);
        if (!user?.pushToken) return res.status(400).json({ error: "No push token registered" });
        const open = await db.select({ id: tasks.id, title: tasks.title })
          .from(tasks)
          .where(and(eq(tasks.userId, req.user.userId), isNull(tasks.completedAt)));
        const body = open.length === 0
          ? "Nothing on your list. Add something worth doing today."
          : open.length === 1
            ? `One thing on your list: "${open[0].title}". Do it early, own the day.`
            : `${open.length} tasks are waiting. Don't scan the list — pick ONE and start. "${open[0].title}"?`;
        const result = await sendBulkPushNotifications([{
          token: user.pushToken,
          title: "Good morning — what's your ONE thing?",
          body,
          data: { type: "morning_kickoff" },
        }]);
        res.json({ success: result.sent > 0, openTaskCount: open.length });
      } catch (err) {
        console.error("Dev morning kickoff error:", err);
        res.status(500).json({ error: "Failed to send test morning kickoff" });
      }
    });

    // POST /api/notifications/test/streak-saver
    // Sends a streak saver notification for the caller (with action buttons).
    app.post("/api/notifications/test/streak-saver", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (!req.user) return res.status(401).json({ error: "Not authenticated" });
        const [user] = await db.select({ pushToken: users.pushToken }).from(users).where(eq(users.id, req.user.userId)).limit(1);
        if (!user?.pushToken) return res.status(400).json({ error: "No push token registered" });
        const [stats] = await db.select({ currentStreak: userStats.currentStreak })
          .from(userStats)
          .where(eq(userStats.userId, req.user.userId))
          .limit(1);
        const streak = stats?.currentStreak ?? 3;
        const result = await sendBulkPushNotifications([{
          token: user.pushToken,
          title: `Your ${streak}-day streak dies at midnight`,
          body: "You're ONE task away from saving it. Pick the smallest thing on your list and go.",
          data: { type: "streak_saver", streak },
          categoryId: "task_nudge",
        }]);
        res.json({ success: result.sent > 0, streak });
      } catch (err) {
        console.error("Dev streak saver error:", err);
        res.status(500).json({ error: "Failed to send test streak saver" });
      }
    });
  }

  startNotificationScheduler();

  const httpServer = createServer(app);

  return httpServer;
}

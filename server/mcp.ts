import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { db } from "./db";
import { connectorKeys, tasks, subtasks, users, userStats } from "@shared/schema";
import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "./authMiddleware";
import { authenticateOAuthToken } from "./oauth";
import { applyCompletionStats } from "./taskActions";

// ---------- Connector key helpers ----------

const KEY_PREFIX = "igid_";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function generateKey(): string {
  return KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
}

async function authenticateConnectorRequest(req: Request): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const key = header.substring(7).trim();
  // OAuth access tokens (issued via the MCP OAuth flow) are also accepted.
  if (!key.startsWith(KEY_PREFIX)) return authenticateOAuthToken(key);

  const rows = await db
    .select()
    .from(connectorKeys)
    .where(and(eq(connectorKeys.keyHash, hashKey(key)), isNull(connectorKeys.revokedAt)))
    .limit(1);
  if (rows.length === 0) return null;

  // Best-effort usage timestamp; never block the request on it.
  db.update(connectorKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(connectorKeys.id, rows[0].id))
    .then(() => {})
    .catch(() => {});

  return rows[0].userId;
}

// ---------- Key management REST endpoints (app-authenticated) ----------

export function registerConnectorKeyRoutes(app: Express) {
  // List keys (metadata only — never the key itself)
  app.get("/api/connector-keys", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const rows = await db
        .select({
          id: connectorKeys.id,
          keyPrefix: connectorKeys.keyPrefix,
          label: connectorKeys.label,
          lastUsedAt: connectorKeys.lastUsedAt,
          revokedAt: connectorKeys.revokedAt,
          createdAt: connectorKeys.createdAt,
        })
        .from(connectorKeys)
        .where(and(eq(connectorKeys.userId, req.user!.userId), isNull(connectorKeys.revokedAt)));
      res.json({ keys: rows });
    } catch (err) {
      console.error("List connector keys error:", err);
      res.status(500).json({ error: "Failed to list connector keys" });
    }
  });

  // Create a key — plaintext returned exactly once
  app.post("/api/connector-keys", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const label = typeof req.body?.label === "string" ? req.body.label.slice(0, 100) : null;
      const key = generateKey();
      const [row] = await db
        .insert(connectorKeys)
        .values({
          userId: req.user!.userId,
          keyHash: hashKey(key),
          keyPrefix: key.slice(0, 10),
          label,
        })
        .returning({ id: connectorKeys.id, createdAt: connectorKeys.createdAt });
      res.json({ id: row.id, key, createdAt: row.createdAt });
    } catch (err) {
      console.error("Create connector key error:", err);
      res.status(500).json({ error: "Failed to create connector key" });
    }
  });

  // Revoke a key
  app.delete("/api/connector-keys/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await db
        .update(connectorKeys)
        .set({ revokedAt: new Date() })
        .where(and(eq(connectorKeys.id, req.params.id), eq(connectorKeys.userId, req.user!.userId), isNull(connectorKeys.revokedAt)))
        .returning({ id: connectorKeys.id });
      if (result.length === 0) return res.status(404).json({ error: "Key not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("Revoke connector key error:", err);
      res.status(500).json({ error: "Failed to revoke connector key" });
    }
  });
}

// ---------- MCP server ----------

const VALID_LANES = ["now", "soon", "later", "park"] as const;

function taskSummary(t: typeof tasks.$inferSelect) {
  return {
    id: t.id,
    title: t.title,
    notes: t.notes,
    lane: t.lane,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    overdue: !!t.isOverdue,
    completed: !!t.completedAt,
    createdAt: t.createdAt ? t.createdAt.toISOString() : null,
  };
}

function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

// Look up a task belonging to this user only.
async function findOwnTask(userId: string, taskId: string) {
  const rows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: "i-get-it-done", version: "1.0.0" });

  server.tool(
    "create_task",
    "Create a new task on the user's list. Lane controls urgency: 'now' (do today), 'soon' (this week), 'later' (someday), 'park' (on hold).",
    {
      title: z.string().min(1).max(500).describe("Short task title, like a to-do list line"),
      notes: z.string().max(2000).optional().describe("Optional extra details"),
      lane: z.enum(VALID_LANES).optional().describe("Urgency lane; defaults to 'now'"),
      dueDate: z.string().optional().describe("Optional due date/time in ISO 8601 format"),
    },
    async ({ title, notes, lane, dueDate }) => {
      let due: Date | null = null;
      if (dueDate) {
        due = new Date(dueDate);
        if (isNaN(due.getTime())) return errorResult("Invalid dueDate — use ISO 8601, e.g. 2026-08-05T17:00:00Z");
      }
      const [task] = await db
        .insert(tasks)
        .values({ userId, title, notes: notes || null, lane: lane || "now", dueDate: due })
        .returning();
      await db
        .update(users)
        .set({ lifetimeTasksCreated: sql`COALESCE(${users.lifetimeTasksCreated}, 0) + 1` })
        .where(eq(users.id, userId));
      return textResult({ created: taskSummary(task) });
    }
  );

  server.tool(
    "list_tasks",
    "List the user's tasks. By default returns open (incomplete) tasks. Filter by lane or overdue status.",
    {
      lane: z.enum(VALID_LANES).optional().describe("Only tasks in this lane"),
      overdueOnly: z.boolean().optional().describe("Only overdue tasks"),
      includeCompleted: z.boolean().optional().describe("Include completed tasks (default false)"),
    },
    async ({ lane, overdueOnly, includeCompleted }) => {
      const conditions = [eq(tasks.userId, userId)];
      if (!includeCompleted) conditions.push(isNull(tasks.completedAt));
      if (lane) conditions.push(eq(tasks.lane, lane));
      if (overdueOnly) conditions.push(eq(tasks.isOverdue, true));
      const rows = await db.select().from(tasks).where(and(...conditions)).limit(200);
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
      const [updated] = await db
        .update(tasks)
        .set({ completedAt: new Date() })
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
        .returning();
      await applyCompletionStats(userId);
      return textResult({ completed: taskSummary(updated) });
    }
  );

  server.tool(
    "snooze_task",
    "Snooze a task's reminders for a number of hours (default 1) so the nudge engine stays quiet about it.",
    {
      taskId: z.string().describe("ID of the task to snooze"),
      hours: z.number().min(1).max(72).optional().describe("How many hours to snooze (1-72, default 1)"),
    },
    async ({ taskId, hours }) => {
      const task = await findOwnTask(userId, taskId);
      if (!task) return errorResult("Task not found");
      const until = new Date(Date.now() + (hours ?? 1) * 60 * 60 * 1000);
      await db.update(tasks).set({ lastNudgeAt: until }).where(eq(tasks.id, taskId));
      return textResult({ snoozed: true, taskId, remindersQuietUntil: until.toISOString() });
    }
  );

  server.tool(
    "add_subtasks",
    "Break a task into smaller steps by adding subtasks to it. Great for making a big task feel doable.",
    {
      taskId: z.string().describe("ID of the parent task"),
      subtasks: z.array(z.string().min(1).max(500)).min(1).max(20).describe("Titles of the subtasks to add, in order"),
    },
    async ({ taskId, subtasks: titles }) => {
      const task = await findOwnTask(userId, taskId);
      if (!task) return errorResult("Task not found");
      const rows = await db
        .insert(subtasks)
        .values(titles.map((title) => ({ taskId, title })))
        .returning();
      return textResult({
        task: task.title,
        added: rows.map((s) => ({ id: s.id, title: s.title })),
      });
    }
  );

  server.tool(
    "get_stats",
    "Get the user's productivity stats: current streak, longest streak, points, level, and totals.",
    {},
    async () => {
      const [stats] = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
      const [openCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.completedAt)));
      const [overdueCount] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.completedAt), eq(tasks.isOverdue, true)));
      return textResult({
        currentStreak: stats?.currentStreak ?? 0,
        longestStreak: stats?.longestStreak ?? 0,
        points: stats?.points ?? 0,
        level: stats?.level ?? "starter",
        totalTasksCompleted: stats?.totalTasksCompleted ?? 0,
        totalFocusMinutes: stats?.totalFocusMinutes ?? 0,
        openTasks: openCount?.n ?? 0,
        overdueTasks: overdueCount?.n ?? 0,
      });
    }
  );

  return server;
}

// ---------- HTTP endpoint (stateless streamable HTTP) ----------

export function registerMcpRoutes(app: Express) {
  app.post("/mcp", async (req: Request, res: Response) => {
    let userId: string | null = null;
    try {
      userId = await authenticateConnectorRequest(req);
    } catch (err) {
      console.error("MCP auth error:", err);
    }
    if (!userId) {
      // Point OAuth-capable clients (like Claude) at the protected resource
      // metadata so they can start the authorization flow automatically.
      const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol || "https";
      const host = (req.headers["x-forwarded-host"] as string)?.split(",")[0] || req.headers.host;
      res.set(
        "WWW-Authenticate",
        `Bearer resource_metadata="${proto}://${host}/.well-known/oauth-protected-resource"`
      );
      return res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: "Unauthorized: sign in via OAuth or provide a valid connector key as a Bearer token" },
        id: null,
      });
    }

    // Stateless mode: fresh server + transport per request so no session state
    // can leak between users.
    const server = buildMcpServer(userId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
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
          id: null,
        });
      }
    }
  });

  // Stateless server: no SSE stream or sessions to manage.
  const methodNotAllowed = (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);
}

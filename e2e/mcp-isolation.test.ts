/**
 * MCP connector isolation tests.
 *
 * Verifies, against a running dev server (default http://localhost:5000):
 *  - every MCP tool works with a valid connector key
 *  - operations on another user's task IDs fail (no cross-user access or leakage)
 *  - a revoked key gets 401
 *  - complete_task updates streak/points exactly once
 *
 * Test users and connector keys are seeded directly in the database (bypassing
 * the rate-limited auth routes) and cleaned up afterwards.
 *
 * Run with: npm run test:mcp
 */
import crypto from "crypto";
import { db, pool } from "../server/db";
import { connectorKeys, subtasks, tasks, users, userStats } from "@shared/schema";
import { eq, inArray } from "drizzle-orm";

const BASE_URL = process.env.MCP_TEST_BASE_URL || "http://localhost:5000";
const KEY_PREFIX = "igid_";

// ---------- tiny test harness ----------
let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// ---------- MCP client helpers (stateless streamable HTTP) ----------
let rpcId = 0;

async function mcpRequest(key: string | null, method: string, params: unknown) {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  const text = await res.text();
  let json: any = null;
  // Streamable HTTP may respond as SSE; extract the data line(s).
  if (text.startsWith("event:") || text.includes("\ndata:") || text.startsWith("data:")) {
    for (const line of text.split("\n")) {
      if (line.startsWith("data:")) {
        try {
          json = JSON.parse(line.slice(5).trim());
        } catch {
          /* keep last parseable */
        }
      }
    }
  } else if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
  }
  return { status: res.status, json };
}

async function callTool(key: string, name: string, args: Record<string, unknown>) {
  const { status, json } = await mcpRequest(key, "tools/call", { name, arguments: args });
  const result = json?.result;
  let payload: any = null;
  const textContent = result?.content?.find((c: any) => c.type === "text")?.text;
  if (textContent) {
    try {
      payload = JSON.parse(textContent);
    } catch {
      payload = textContent;
    }
  }
  return { status, isError: !!result?.isError, payload, raw: json };
}

// ---------- DB seeding ----------
function generateKey(): string {
  return KEY_PREFIX + crypto.randomBytes(24).toString("base64url");
}
function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

async function seedUser(email: string) {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: "test-not-a-real-hash" })
    .returning();
  await db.insert(userStats).values({ userId: user.id });
  const key = generateKey();
  const [keyRow] = await db
    .insert(connectorKeys)
    .values({ userId: user.id, keyHash: hashKey(key), keyPrefix: key.slice(0, 10), label: "isolation-test" })
    .returning();
  return { user, key, keyId: keyRow.id };
}

async function cleanup(userIds: string[]) {
  if (userIds.length === 0) return;
  const taskRows = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(inArray(tasks.userId, userIds));
  const taskIds = taskRows.map((t) => t.id);
  if (taskIds.length > 0) await db.delete(subtasks).where(inArray(subtasks.taskId, taskIds));
  await db.delete(tasks).where(inArray(tasks.userId, userIds));
  await db.delete(connectorKeys).where(inArray(connectorKeys.userId, userIds));
  await db.delete(userStats).where(inArray(userStats.userId, userIds));
  await db.delete(users).where(inArray(users.id, userIds));
}

async function getStatsRow(userId: string) {
  const [row] = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
  return row;
}

// ---------- tests ----------
async function main() {
  // Sanity: server reachable
  const ping = await mcpRequest(null, "tools/list", {});
  if (ping.status !== 401) {
    console.error(`Server at ${BASE_URL} did not respond as expected (got ${ping.status}). Is the dev server running?`);
    process.exit(1);
  }

  const stamp = Date.now();
  const alice = await seedUser(`mcp-test-alice-${stamp}@example.com`);
  const bob = await seedUser(`mcp-test-bob-${stamp}@example.com`);
  const userIds = [alice.user.id, bob.user.id];

  try {
    console.log("\n== Auth checks ==");
    check("missing key gets 401", ping.status === 401);
    const badKey = await mcpRequest(KEY_PREFIX + "invalidinvalidinvalid", "tools/list", {});
    check("invalid key gets 401", badKey.status === 401);

    console.log("\n== Every tool works with a valid key ==");
    const toolsList = await mcpRequest(alice.key, "tools/list", {});
    const toolNames: string[] = (toolsList.json?.result?.tools ?? []).map((t: any) => t.name).sort();
    const expectedTools = ["add_subtasks", "complete_task", "create_task", "get_stats", "list_tasks", "snooze_task"];
    check(
      "tools/list returns exactly the expected tools",
      JSON.stringify(toolNames) === JSON.stringify(expectedTools),
      `got: ${toolNames.join(", ")}`
    );

    const created = await callTool(alice.key, "create_task", {
      title: "Alice isolation test task",
      notes: "created by automated test",
      lane: "soon",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });
    const aliceTaskId: string | undefined = created.payload?.created?.id;
    check("create_task creates a task", !created.isError && !!aliceTaskId);

    const bobCreated = await callTool(bob.key, "create_task", { title: "Bob isolation test task" });
    const bobTaskId: string | undefined = bobCreated.payload?.created?.id;
    check("create_task works for second user", !bobCreated.isError && !!bobTaskId);

    const listed = await callTool(alice.key, "list_tasks", {});
    const listedIds: string[] = (listed.payload?.tasks ?? []).map((t: any) => t.id);
    check("list_tasks returns Alice's task", listedIds.includes(aliceTaskId!));
    check("list_tasks does NOT include Bob's task", !listedIds.includes(bobTaskId!));

    const snoozed = await callTool(alice.key, "snooze_task", { taskId: aliceTaskId!, hours: 2 });
    check("snooze_task works on own task", !snoozed.isError && snoozed.payload?.snoozed === true);

    const subAdded = await callTool(alice.key, "add_subtasks", {
      taskId: aliceTaskId!,
      subtasks: ["step one", "step two"],
    });
    check("add_subtasks works on own task", !subAdded.isError && subAdded.payload?.added?.length === 2);

    const stats = await callTool(alice.key, "get_stats", {});
    check("get_stats works", !stats.isError && typeof stats.payload?.points === "number");

    console.log("\n== Cross-user isolation (Bob attacks Alice's task) ==");
    const xComplete = await callTool(bob.key, "complete_task", { taskId: aliceTaskId! });
    check("complete_task on other user's task fails", xComplete.isError, JSON.stringify(xComplete.payload));
    const xSnooze = await callTool(bob.key, "snooze_task", { taskId: aliceTaskId! });
    check("snooze_task on other user's task fails", xSnooze.isError);
    const xSub = await callTool(bob.key, "add_subtasks", { taskId: aliceTaskId!, subtasks: ["evil"] });
    check("add_subtasks on other user's task fails", xSub.isError);

    // Verify no side effects landed on Alice's task
    const [aliceTaskRow] = await db.select().from(tasks).where(eq(tasks.id, aliceTaskId!)).limit(1);
    check("Alice's task remains incomplete after Bob's attempt", !aliceTaskRow.completedAt);
    const subRows = await db.select().from(subtasks).where(eq(subtasks.taskId, aliceTaskId!));
    check("no rogue subtasks added by Bob", subRows.every((s) => s.title !== "evil"));

    console.log("\n== complete_task updates streak/points exactly once ==");
    const statsBefore = await getStatsRow(alice.user.id);
    const completed = await callTool(alice.key, "complete_task", { taskId: aliceTaskId! });
    check("complete_task works on own task", !completed.isError && !!completed.payload?.completed);
    const statsAfter = await getStatsRow(alice.user.id);
    check(
      "points increased by exactly 10",
      (statsAfter.points ?? 0) === (statsBefore.points ?? 0) + 10,
      `before=${statsBefore.points} after=${statsAfter.points}`
    );
    check(
      "totalTasksCompleted increased by exactly 1",
      (statsAfter.totalTasksCompleted ?? 0) === (statsBefore.totalTasksCompleted ?? 0) + 1
    );
    check("streak is at least 1 after completion", (statsAfter.currentStreak ?? 0) >= 1);

    // Completing again must be a no-op for stats
    const again = await callTool(alice.key, "complete_task", { taskId: aliceTaskId! });
    check("second complete_task reports alreadyCompleted", again.payload?.alreadyCompleted === true);
    const statsTwice = await getStatsRow(alice.user.id);
    check(
      "points unchanged after duplicate completion",
      (statsTwice.points ?? 0) === (statsAfter.points ?? 0),
      `after=${statsAfter.points} twice=${statsTwice.points}`
    );
    check(
      "totalTasksCompleted unchanged after duplicate completion",
      (statsTwice.totalTasksCompleted ?? 0) === (statsAfter.totalTasksCompleted ?? 0)
    );

    console.log("\n== Revoked key lifecycle ==");
    await db.update(connectorKeys).set({ revokedAt: new Date() }).where(eq(connectorKeys.id, bob.keyId));
    const revoked = await mcpRequest(bob.key, "tools/list", {});
    check("revoked key gets 401", revoked.status === 401);
    const revokedCall = await mcpRequest(bob.key, "tools/call", {
      name: "list_tasks",
      arguments: {},
    });
    check("revoked key cannot call tools", revokedCall.status === 401);
    check("Alice's key still works after Bob's revocation", (await mcpRequest(alice.key, "tools/list", {})).status === 200);
  } finally {
    await cleanup(userIds);
    await pool.end();
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error("Failures:\n - " + failures.join("\n - "));
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error("Test run crashed:", err);
  process.exit(1);
});

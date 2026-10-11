// Integration tests for Team (invites, linking, hand-offs) and voice capture.
//
// Run with the dev server up:   node tests/team-and-voice.test.mjs
//
// Voice tests need the server pointed at the local stub this script starts:
//   DEEPGRAM_API_KEY=test DEEPGRAM_API_URL=http://localhost:5099/v1/listen \
//   OPENAI_API_KEY=test OPENAI_API_URL=http://localhost:5099/v1/chat/completions \
//   npm run server:dev
//   VOICE_STUB=1 node tests/team-and-voice.test.mjs
// Without VOICE_STUB=1 the voice section is skipped.

import crypto from "crypto";
import http from "http";

const BASE = process.env.BASE_URL || "http://localhost:5000";
const STUB_PORT = Number(process.env.STUB_PORT || 5099);
const PASSWORD = "Test123!pass";
const run = crypto.randomBytes(4).toString("hex");

let passed = 0;
let failed = 0;
function check(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name} ${extra}`);
  }
}

async function call(method, path, { body, token, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, { method, headers, body: payload });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function register(tag) {
  const email = `${tag}-${run}@example.com`;
  const r = await call("POST", "/api/auth/register", { body: { email, password: PASSWORD } });
  if (r.status !== 200) throw new Error(`register ${tag} failed: ${r.status} ${JSON.stringify(r.data)}`);
  return { id: r.data.user.id, token: r.data.token, email };
}

async function createTask(user, title, extra = {}) {
  const r = await call("POST", "/api/tasks", { token: user.token, body: { userId: user.id, title, lane: "now", ...extra } });
  if (r.status !== 200) throw new Error(`create task failed: ${r.status} ${JSON.stringify(r.data)}`);
  return r.data.task;
}

async function getTask(user, taskId) {
  const r = await call("GET", `/api/tasks/${user.id}`, { token: user.token });
  return r.data.tasks.find((t) => t.id === taskId);
}

async function link(owner, mate) {
  const inv = await call("POST", "/api/team/invite", { token: owner.token, body: { inviteeEmail: mate.email } });
  return call("POST", "/api/team/invite/accept", { token: mate.token, body: { inviteCode: inv.data.invite.inviteCode } });
}

async function teamTests() {
  console.log("Team: invites and linking");
  const owner = await register("team-owner");
  const mate = await register("team-mate");
  const stranger = await register("team-stranger");

  // Owner types the invitee's email in capitals; it must still reach them.
  const inv = await call("POST", "/api/team/invite", {
    token: owner.token,
    body: { inviterId: owner.id, inviteeEmail: `  ${mate.email.toUpperCase()} ` },
  });
  check("create invite", inv.status === 200 && inv.data.invite.inviteeEmail === mate.email, JSON.stringify(inv.data));
  const code = inv.data.invite.inviteCode;
  check("invite code is 8 unambiguous characters", /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code), code);

  check("invite requires login", (await call("POST", "/api/team/invite", { body: { inviterId: owner.id } })).status === 401);
  check(
    "can't create an invite on someone else's behalf",
    (await call("POST", "/api/team/invite", { token: stranger.token, body: { inviterId: owner.id } })).status === 403
  );
  check(
    "can't invite yourself",
    (await call("POST", "/api/team/invite", { token: owner.token, body: { inviteeEmail: owner.email } })).status === 400
  );

  const received = await call("GET", `/api/team/invites/${mate.id}`, { token: mate.token });
  check(
    "invitee sees the invite (email matched case-insensitively)",
    received.data.receivedInvites?.length === 1 && received.data.receivedInvites[0].inviterEmail === owner.email,
    JSON.stringify(received.data)
  );
  check("strangers can't read someone's invites", (await call("GET", `/api/team/invites/${mate.id}`, { token: stranger.token })).status === 403);
  check("invites list requires login", (await call("GET", `/api/team/invites/${mate.id}`)).status === 401);

  check(
    "can't join your own team",
    (await call("POST", "/api/team/invite/accept", { token: owner.token, body: { inviteCode: code } })).status === 400
  );
  check(
    "can't accept on someone else's behalf",
    (await call("POST", "/api/team/invite/accept", { token: stranger.token, body: { inviteCode: code, userId: mate.id } })).status === 403
  );
  const accept = await call("POST", "/api/team/invite/accept", {
    token: mate.token,
    body: { inviteCode: ` ${code.toLowerCase()} `, userId: mate.id },
  });
  check("accept with lowercase + spaces works", accept.status === 200 && accept.data.teamMember?.teammateId === owner.id, JSON.stringify(accept.data));
  check(
    "used invite can't be reused",
    (await call("POST", "/api/team/invite/accept", { token: stranger.token, body: { inviteCode: code } })).status === 400
  );

  const ownerMembers = await call("GET", `/api/team/members/${owner.id}`, { token: owner.token });
  const mateMembers = await call("GET", `/api/team/members/${mate.id}`, { token: mate.token });
  check("owner sees mate as linked", ownerMembers.data.members?.length === 1 && ownerMembers.data.members[0].teammateId === mate.id);
  check("mate sees owner as linked", mateMembers.data.members?.length === 1 && mateMembers.data.members[0].teammateEmail === owner.email);
  check("team members require login", (await call("GET", `/api/team/members/${owner.id}`)).status === 401);
  check("strangers can't read a team", (await call("GET", `/api/team/members/${owner.id}`, { token: stranger.token })).status === 403);

  console.log("Team: invite management");
  const inv2 = await call("POST", "/api/team/invite", { token: owner.token, body: { inviteeEmail: stranger.email } });
  const inv2Id = inv2.data.invite.id;
  const regen = await call("POST", `/api/team/invite/${inv2Id}/regenerate`, { token: owner.token });
  check(
    "regenerate gives a new valid code",
    regen.status === 200 && regen.data.invite.inviteCode !== inv2.data.invite.inviteCode && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(regen.data.invite.inviteCode)
  );
  check("strangers can't regenerate", (await call("POST", `/api/team/invite/${inv2Id}/regenerate`, { token: mate.token })).status === 404);
  const resend = await call("POST", `/api/team/invite/${inv2Id}/resend`, { token: owner.token });
  check("resend refreshes the expiry", resend.status === 200 && new Date(resend.data.invite.expiresAt) > new Date(Date.now() + 6 * 86400000));
  check("strangers can't cancel", (await call("DELETE", `/api/team/invite/${inv2Id}`, { token: mate.token })).status === 404);
  check("non-invitee can't decline", (await call("POST", "/api/team/invite/decline", { token: mate.token, body: { inviteId: inv2Id } })).status === 404);
  check("invitee can decline", (await call("POST", "/api/team/invite/decline", { token: stranger.token, body: { inviteId: inv2Id } })).status === 200);
  const inv3 = await call("POST", "/api/team/invite", { token: owner.token, body: {} });
  check("owner can cancel own invite", (await call("DELETE", `/api/team/invite/${inv3.data.invite.id}`, { token: owner.token })).status === 200);

  console.log("Team: hand-offs");
  const task = await createTask(owner, "Hand this off");
  const toStranger = await call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { delegatedToUserId: stranger.id } });
  check("can't hand off to someone who isn't linked", toStranger.status === 400);
  // App Store builds send the whole task on every save. A stale hand-off in
  // that payload must not block the rest of the save.
  const fullSave = await call("PUT", `/api/tasks/${task.id}`, {
    token: owner.token,
    body: { title: "Hand this off", lane: "soon", delegatedToUserId: stranger.id, delegationStatus: "assigned", assignedTo: "Stranger" },
  });
  check(
    "full save with a stale hand-off keeps the other changes and drops the hand-off",
    fullSave.status === 200 && fullSave.data.task.lane === "soon" && fullSave.data.task.delegatedToUserId === null && fullSave.data.task.assignedTo === null,
    JSON.stringify(fullSave.data)
  );
  await call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { lane: "now" } });
  const handoff = await call("PUT", `/api/tasks/${task.id}`, {
    token: owner.token,
    body: { assignedTo: "Mate", delegatedToUserId: mate.id, delegationStatus: "assigned" },
  });
  check("hand off to linked teammate", handoff.status === 200 && handoff.data.task.delegatedToUserId === mate.id && !!handoff.data.task.delegatedAt);

  const dtm = await call("GET", `/api/delegated-to-me/${mate.id}`, { token: mate.token });
  check(
    "teammate sees the handed-off task",
    dtm.data.tasks?.length === 1 && dtm.data.tasks[0].id === task.id && dtm.data.tasks[0].ownerEmail === owner.email,
    JSON.stringify(dtm.data)
  );
  check("delegated-to-me requires login", (await call("GET", `/api/delegated-to-me/${mate.id}`)).status === 401);
  check("strangers can't read delegated-to-me", (await call("GET", `/api/delegated-to-me/${mate.id}`, { token: stranger.token })).status === 403);

  const statusUpdate = await call("PUT", `/api/delegation-status/${task.id}`, {
    token: mate.token,
    body: { userId: mate.id, status: "in_progress", note: "On it" },
  });
  check("teammate updates status with a note", statusUpdate.status === 200 && statusUpdate.data.task.delegationStatus === "in_progress");
  check("invalid status rejected", (await call("PUT", `/api/delegation-status/${task.id}`, { token: mate.token, body: { status: "bogus" } })).status === 400);
  check("status update requires login", (await call("PUT", `/api/delegation-status/${task.id}`, { body: { userId: mate.id, status: "done" } })).status === 401);
  check(
    "can't spoof another user's status update",
    (await call("PUT", `/api/delegation-status/${task.id}`, { token: stranger.token, body: { userId: mate.id, status: "done" } })).status === 403
  );
  check(
    "non-delegate can't update status",
    (await call("PUT", `/api/delegation-status/${task.id}`, { token: stranger.token, body: { status: "done" } })).status === 403
  );

  // An App Store build saving the whole task (with the status it loaded
  // before the teammate's update) must not undo the teammate's status.
  const staleSave = await call("PUT", `/api/tasks/${task.id}`, {
    token: owner.token,
    body: {
      title: "Hand this off", lane: "soon", reminderType: "soft", isOverdue: false, focusTimeMinutes: 0,
      assignedTo: "Mate", delegatedToUserId: mate.id, delegationStatus: "assigned",
      delegatedAt: new Date(0).toISOString(), lastDelegationUpdate: new Date(0).toISOString(),
    },
  });
  check(
    "owner's full save keeps the teammate's status and applies the rest",
    staleSave.status === 200 && staleSave.data.task.delegationStatus === "in_progress" && staleSave.data.task.lane === "soon" && staleSave.data.task.delegatedToUserId === mate.id,
    JSON.stringify(staleSave.data)
  );
  const staleAfterReload = await call("PUT", `/api/tasks/${task.id}`, {
    token: owner.token,
    body: { title: "Hand this off", lane: "now", delegationStatus: "assigned", assignedTo: "Mate" },
  });
  check(
    "full save without the teammate id (old app after reload) keeps the hand-off",
    staleAfterReload.status === 200 && staleAfterReload.data.task.delegatedToUserId === mate.id && staleAfterReload.data.task.delegationStatus === "in_progress",
    JSON.stringify(staleAfterReload.data)
  );

  const ownerNote = await call("POST", "/api/delegation-notes", { token: owner.token, body: { taskId: task.id, type: "question", text: "ETA?" } });
  check("owner adds a note", ownerNote.status === 200 && ownerNote.data.note.authorId === owner.id);
  check(
    "strangers can't add notes",
    (await call("POST", "/api/delegation-notes", { token: stranger.token, body: { taskId: task.id, type: "custom", text: "spam" } })).status === 403
  );
  check("notes require login", (await call("POST", "/api/delegation-notes", { body: { taskId: task.id, type: "custom", text: "x" } })).status === 401);

  const ownerView = await getTask(owner, task.id);
  check(
    "owner sees teammate's status and both notes",
    ownerView.delegationStatus === "in_progress" &&
      ownerView.delegationNotes.some((n) => n.authorId === mate.id && n.text === "On it") &&
      ownerView.delegationNotes.some((n) => n.authorId === owner.id),
    JSON.stringify(ownerView)
  );
  const mateView = (await call("GET", `/api/delegated-to-me/${mate.id}`, { token: mate.token })).data.tasks[0];
  check("teammate sees the owner's note", mateView.delegationNotes.some((n) => n.text === "ETA?"));

  console.log("Team: task ownership and field safety");
  const hijack = await call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { userId: stranger.id, nudgeCount: 99 } });
  check("PUT ignores userId and internal columns", hijack.status === 200 && hijack.data.task.userId === owner.id && hijack.data.task.nudgeCount === 0);
  check("teammate can't edit owner's task directly", (await call("PUT", `/api/tasks/${task.id}`, { token: mate.token, body: { title: "x" } })).status === 403);
  check("bad lane rejected", (await call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { lane: "someday" } })).status === 400);
  check("bad date rejected", (await call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { dueDate: "not a date" } })).status === 400);
  check("missing task is 404", (await call("PUT", `/api/tasks/does-not-exist`, { token: owner.token, body: { title: "x" } })).status === 404);
  const repeatCreate = await call("POST", "/api/tasks", { token: owner.token, body: { id: task.id, userId: owner.id, title: "dupe" } });
  check("retried create with same id is idempotent", repeatCreate.status === 200 && repeatCreate.data.task.title === "Hand this off");

  console.log("Team: subtasks, contacts, profile");
  const sub = await call("POST", "/api/subtasks", { token: owner.token, body: { id: `st-${run}`, taskId: task.id, title: "Step 1" } });
  check("owner adds subtask", sub.status === 200);
  check("retried subtask create is idempotent", (await call("POST", "/api/subtasks", { token: owner.token, body: { id: `st-${run}`, taskId: task.id, title: "Step 1" } })).status === 200);
  check("strangers can't add subtasks", (await call("POST", "/api/subtasks", { token: stranger.token, body: { taskId: task.id, title: "spam" } })).status === 403);
  check("subtasks require login", (await call("POST", "/api/subtasks", { body: { taskId: task.id, title: "spam" } })).status === 401);
  check("strangers can't toggle subtasks", (await call("PUT", `/api/subtasks/st-${run}`, { token: stranger.token, body: { completed: true } })).status === 404);
  check("strangers can't delete subtasks", (await call("DELETE", `/api/subtasks/st-${run}`, { token: stranger.token })).status === 404);
  const toggled = await call("PUT", `/api/subtasks/st-${run}`, { token: owner.token, body: { completed: true } });
  check("owner toggles subtask", toggled.status === 200 && toggled.data.subtask.completed === true);

  const contactId = `c-${run}`;
  await call("POST", "/api/contacts", { token: owner.token, body: { id: contactId, userId: owner.id, name: "Sam" } });
  const renamed = await call("POST", "/api/contacts", { token: owner.token, body: { id: contactId, userId: owner.id, name: "Samantha", role: "Ops" } });
  check("editing a contact updates it in place", renamed.status === 200 && renamed.data.contact.name === "Samantha");
  const contactTask = await createTask(owner, "For a contact");
  await call("PUT", `/api/tasks/${contactTask.id}`, { token: owner.token, body: { assignedTo: contactId, delegationStatus: "assigned" } });
  check("strangers can't delete contacts", (await call("DELETE", `/api/contacts/${contactId}`, { token: stranger.token })).status === 404);
  check("owner deletes contact", (await call("DELETE", `/api/contacts/${contactId}`, { token: owner.token })).status === 200);
  check("deleting a contact unassigns their tasks", (await getTask(owner, contactTask.id)).assignedTo === null);

  check("strangers can't rename users", (await call("PUT", `/api/users/${owner.id}/display-name`, { token: stranger.token, body: { displayName: "pwned" } })).status === 403);
  check("rename requires login", (await call("PUT", `/api/users/${owner.id}/display-name`, { body: { displayName: "pwned" } })).status === 401);
  const renamedSelf = await call("PUT", `/api/users/${owner.id}/display-name`, { token: owner.token, body: { displayName: "  Owner  " } });
  check("rename self", renamedSelf.status === 200 && renamedSelf.data.user.displayName === "Owner");

  console.log("Team: completion and un-delegation");
  const pts = async (u) => (await call("GET", `/api/stats/${u.id}`, { token: u.token })).data.stats;
  const before = await pts(owner);
  const doneAt = new Date().toISOString();
  await Promise.all([
    call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { completedAt: doneAt } }),
    call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { completedAt: doneAt } }),
    call("PUT", `/api/tasks/${task.id}`, { token: owner.token, body: { completedAt: doneAt } }),
  ]);
  const after = await pts(owner);
  check("simultaneous completes count once", after.points - (before.points || 0) === 10 && after.totalTasksCompleted - (before.totalTasksCompleted || 0) === 1, `${before.points} -> ${after.points}`);
  check("completed hand-off leaves teammate's list", (await call("GET", `/api/delegated-to-me/${mate.id}`, { token: mate.token })).data.tasks.length === 0);

  const task2 = await createTask(owner, "Undelegate me");
  await call("PUT", `/api/tasks/${task2.id}`, { token: owner.token, body: { assignedTo: "Mate", delegatedToUserId: mate.id } });
  const cleared = await call("PUT", `/api/tasks/${task2.id}`, {
    token: owner.token,
    body: { assignedTo: null, delegatedToUserId: null, delegationStatus: null, delegatedAt: null, lastDelegationUpdate: null },
  });
  check("un-delegate clears all hand-off fields", cleared.status === 200 && cleared.data.task.delegatedToUserId === null && cleared.data.task.assignedTo === null);

  console.log("Team: unlinking and account deletion");
  const task3 = await createTask(owner, "Open hand-off");
  await call("PUT", `/api/tasks/${task3.id}`, { token: owner.token, body: { assignedTo: "Mate", delegatedToUserId: mate.id } });
  const mateMemberRow = (await call("GET", `/api/team/members/${mate.id}`, { token: mate.token })).data.members[0];
  check("strangers can't unlink others", (await call("DELETE", `/api/team/members/${mateMemberRow.id}`, { token: stranger.token })).status === 404);
  check("unlink requires login", (await call("DELETE", `/api/team/members/${mateMemberRow.id}`)).status === 401);
  check("teammate unlinks", (await call("DELETE", `/api/team/members/${mateMemberRow.id}`, { token: mate.token })).status === 200);
  check("unlink is mutual", (await call("GET", `/api/team/members/${owner.id}`, { token: owner.token })).data.members.length === 0);
  check("open hand-offs end on unlink", (await getTask(owner, task3.id)).delegatedToUserId === null);

  check("re-link after unlink", (await link(owner, mate)).status === 200);
  check("both sides restored", (await call("GET", `/api/team/members/${owner.id}`, { token: owner.token })).data.members.length === 1);
  const task4 = await createTask(owner, "Before delete");
  await call("PUT", `/api/tasks/${task4.id}`, { token: owner.token, body: { assignedTo: "Mate", delegatedToUserId: mate.id } });
  await call("PUT", `/api/delegation-status/${task4.id}`, { token: mate.token, body: { status: "waiting", note: "blocked on parts" } });
  const del = await call("DELETE", `/api/account/${mate.id}`, { token: mate.token, body: { password: PASSWORD } });
  check("teammate with a hand-off can delete their account", del.status === 200, JSON.stringify(del.data));
  const t4 = await getTask(owner, task4.id);
  check("owner's task survives and is released", !!t4 && t4.delegatedToUserId === null);
  check("owner's team is empty after teammate deletes account", (await call("GET", `/api/team/members/${owner.id}`, { token: owner.token })).data.members.length === 0);

  console.log("Auth: password change");
  const wrong = await call("POST", "/api/auth/change-password", { token: owner.token, body: { currentPassword: "nope", newPassword: "Newpass1!x" } });
  check("wrong current password is 400, not 401 (401 would sign the user out)", wrong.status === 400);
  check("change password requires login", (await call("POST", "/api/auth/change-password", { body: { userId: owner.id, currentPassword: PASSWORD, newPassword: "Newpass1!x" } })).status === 401);
  check(
    "weak new password rejected with the signup rules",
    (await call("POST", "/api/auth/change-password", { token: owner.token, body: { currentPassword: PASSWORD, newPassword: "abcdef" } })).status === 400
  );
  check(
    "can't change someone else's password",
    (await call("POST", "/api/auth/change-password", { token: stranger.token, body: { userId: owner.id, currentPassword: PASSWORD, newPassword: "Newpass1!x" } })).status === 403
  );
  check("change password", (await call("POST", "/api/auth/change-password", { token: owner.token, body: { currentPassword: PASSWORD, newPassword: "Newpass1!x" } })).status === 200);
}

async function billingTests() {
  console.log("Billing: RevenueCat webhook (dev server, no webhook secret set)");
  const buyer = await register("billing");
  const status = async () => (await call("GET", `/api/subscription/${buyer.id}`, { token: buyer.token })).data.subscription;
  const send = (event) => call("POST", "/api/webhooks/revenuecat", { body: { event } });

  await send({ type: "TRANSFER", transferred_from: ["$RCAnonymousID:x"], transferred_to: [buyer.id] });
  check("a transfer alone never grants Pro", (await status()).isActive === false);
  await send({ type: "INITIAL_PURCHASE", app_user_id: buyer.id, period_type: "NORMAL" });
  check("purchase grants Pro", (await status()).isActive === true);
  await send({ type: "CANCELLATION", app_user_id: buyer.id });
  check("cancelling keeps Pro until the paid period ends", (await status()).isActive === true);
  await send({ type: "EXPIRATION", app_user_id: buyer.id });
  check("expiration removes Pro", (await status()).isActive === false);
  await send({ type: "RENEWAL", app_user_id: buyer.id, period_type: "NORMAL" });
  await send({ type: "TRANSFER", transferred_from: [buyer.id], transferred_to: ["someone-else"] });
  check("transferring away removes Pro from the old account", (await status()).isActive === false);
}

// ---- Voice ----

let stubRequests = [];
let deepgramMode = "ok";
let stubDuration = 4.2;

function startStub() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        stubRequests.push({ url: req.url, contentType: req.headers["content-type"], bytes: body.length, auth: req.headers.authorization });
        if (req.url.startsWith("/v1/listen")) {
          if (deepgramMode === "unauthorized") {
            res.writeHead(401, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ err_code: "INVALID_AUTH" }));
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            metadata: { duration: stubDuration },
            results: { channels: [{ alternatives: [{ transcript: "I need to call mom and buy milk", confidence: 0.97 }] }] },
          }));
        }
        if (req.url.startsWith("/v1/chat/completions")) {
          res.writeHead(200, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ tasks: [{ title: "  Call mom " }, { title: "Buy milk" }, { title: "" }, { nope: 1 }] }) } }],
          }));
        }
        res.writeHead(404);
        res.end();
      });
    });
    server.listen(STUB_PORT, () => resolve(server));
  });
}

function audioForm(bytes, type, filename, durationSeconds) {
  const form = new FormData();
  form.append("audio", new Blob([bytes], { type }), filename);
  if (durationSeconds !== undefined) form.append("durationSeconds", String(durationSeconds));
  return form;
}

async function voiceTests() {
  console.log("Voice: transcription");
  const stub = await startStub();
  try {
    const user = await register("voice");
    const audio = crypto.randomBytes(4000);

    check("transcribe requires login", (await call("POST", "/api/transcribe", { form: audioForm(audio, "audio/mp4", "r.m4a", 3) })).status === 401);
    check("missing file is 400", (await call("POST", "/api/transcribe", { token: user.token, form: new FormData() })).status === 400);

    stubRequests = [];
    const native = await call("POST", "/api/transcribe", { token: user.token, form: audioForm(audio, "audio/mp4", "recording.m4a", 3) });
    check("phone recording (m4a) transcribes", native.status === 200 && native.data.text === "I need to call mom and buy milk", JSON.stringify(native.data));
    check("phone audio sent to Deepgram as audio/mp4", stubRequests[0]?.contentType === "audio/mp4" && stubRequests[0]?.bytes === 4000, JSON.stringify(stubRequests[0]));
    check("billing uses Deepgram's longer duration (5s, not the 3s reported)", native.data.secondsRemaining === 595, String(native.data.secondsRemaining));

    stubRequests = [];
    const web = await call("POST", "/api/transcribe", { token: user.token, form: audioForm(audio, "audio/webm;codecs=opus", "recording.webm", 2) });
    check("browser recording (webm) transcribes", web.status === 200 && web.data.text.length > 0);
    check("browser audio sent to Deepgram as audio/webm", stubRequests[0]?.contentType === "audio/webm", JSON.stringify(stubRequests[0]));

    const zero = await call("POST", "/api/transcribe", { token: user.token, form: audioForm(audio, "audio/mp4", "r.m4a", 0) });
    check("reporting 0 seconds still bills real audio length", zero.status === 200 && zero.data.secondsRemaining === 585, String(zero.data.secondsRemaining));

    const usage = await call("GET", `/api/voice-usage/${user.id}`, { token: user.token });
    check("usage endpoint agrees", usage.data.secondsUsed === 15 && usage.data.secondsRemaining === 585, JSON.stringify(usage.data));

    deepgramMode = "unauthorized";
    const dgAuth = await call("POST", "/api/transcribe", { token: user.token, form: audioForm(audio, "audio/mp4", "r.m4a", 3) });
    check("Deepgram key failure is 502, never 401 (401 would sign the user out)", dgAuth.status === 502, String(dgAuth.status));
    deepgramMode = "ok";

    stubDuration = 600;
    const big = await call("POST", "/api/transcribe", { token: user.token, form: audioForm(audio, "audio/mp4", "r.m4a", 590) });
    check("a recording started with time left is still transcribed", big.status === 200 && big.data.limitReached === true, JSON.stringify(big.data));
    const over = await call("POST", "/api/transcribe", { token: user.token, form: audioForm(audio, "audio/mp4", "r.m4a", 3) });
    check("after the daily limit, 429 with limitReached", over.status === 429 && over.data.limitReached === true);
    stubDuration = 4.2;

    console.log("Voice: task extraction");
    const ex = await call("POST", "/api/tasks/extract", { token: user.token, body: { transcript: "I need to call mom and buy milk" } });
    check("extraction returns cleaned titles", ex.status === 200 && JSON.stringify(ex.data.tasks) === JSON.stringify([{ title: "Call mom" }, { title: "Buy milk" }]), JSON.stringify(ex.data));
    check("extraction requires login", (await call("POST", "/api/tasks/extract", { body: { transcript: "x" } })).status === 401);
    check("empty transcript returns no tasks", (await call("POST", "/api/tasks/extract", { token: user.token, body: { transcript: "  " } })).data.tasks.length === 0);
  } finally {
    stub.close();
  }
}

async function main() {
  const ping = await fetch(`${BASE}/api/debug/voice-check`).catch(() => null);
  if (!ping || !ping.ok) {
    console.error(`Server at ${BASE} did not respond. Is the dev server running?`);
    process.exit(1);
  }
  await teamTests();
  await billingTests();
  if (process.env.VOICE_STUB === "1") {
    await voiceTests();
  } else {
    console.log("Voice: skipped (set VOICE_STUB=1 and start the server with the stub URLs; see header)");
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

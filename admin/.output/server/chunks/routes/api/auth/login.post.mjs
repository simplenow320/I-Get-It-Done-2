import { d as defineEventHandler, r as readBody, c as createError, a as getRequestIP, b as adminEmails, e as adminSession } from '../../../nitro/nitro.mjs';
import { a as audit } from '../../../_/audit.mjs';
import { s as sql } from '../../../_/db.mjs';
import bcrypt from 'bcryptjs';
import 'unhead/server';
import 'vue';
import 'unhead/legacy';
import 'unhead/plugins';
import 'node:http';
import 'node:https';
import 'node:crypto';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'node:url';
import 'pg';

const failures = /* @__PURE__ */ new Map();
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1e3;
const login_post = defineEventHandler(async (event) => {
  var _a;
  const body = await readBody(event);
  const email = typeof (body == null ? void 0 : body.email) === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof (body == null ? void 0 : body.password) === "string" ? body.password : "";
  if (!email || !password || password.length > 200) {
    throw createError({ statusCode: 400, statusMessage: "Enter your email and password" });
  }
  const key = `${(_a = getRequestIP(event, { xForwardedFor: true })) != null ? _a : "unknown"}:${email}`;
  const entry = failures.get(key);
  if (entry && entry.count >= MAX_FAILURES && entry.until > Date.now()) {
    await audit(event, "auth.login_locked", { adminEmail: email.slice(0, 255) });
    throw createError({ statusCode: 429, statusMessage: "Too many attempts. Try again in 15 minutes." });
  }
  const [user] = adminEmails().includes(email) ? await sql("SELECT id, password_hash FROM users WHERE lower(email) = $1 LIMIT 1", [email]) : [];
  const ok = !!(user == null ? void 0 : user.password_hash) && await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    const count = entry && entry.until > Date.now() ? entry.count + 1 : 1;
    failures.set(key, { count, until: Date.now() + LOCK_MS });
    await audit(event, "auth.login_failed", { adminEmail: email.slice(0, 255), attempt: count });
    throw createError({ statusCode: 401, statusMessage: "Email or password is incorrect, or this account has no admin access" });
  }
  failures.delete(key);
  const session = await adminSession(event);
  await session.update({ userId: user.id, email });
  await audit(event, "auth.login", { adminEmail: email });
  return { email };
});

export { login_post as default };
//# sourceMappingURL=login.post.mjs.map

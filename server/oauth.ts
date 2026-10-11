import type { Express, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { db } from "./db";
import { oauthClients, oauthCodes, oauthTokens, users } from "@shared/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { verifyToken } from "./authMiddleware";

// ---------- Constants ----------

const ACCESS_TOKEN_PREFIX = "igat_";
const REFRESH_TOKEN_PREFIX = "igrt_";
const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function randomToken(prefix: string): string {
  return prefix + crypto.randomBytes(32).toString("base64url");
}

function getBaseUrl(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string)?.split(",")[0] || req.headers.host;
  return `${proto}://${host}`;
}

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.protocol === "https:") return true;
    // Allow http only for localhost (native/desktop loopback flows)
    if (parsed.protocol === "http:" && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) return true;
    return false;
  } catch {
    return false;
  }
}

// ---------- Token verification (used by /mcp) ----------

export async function authenticateOAuthToken(token: string): Promise<string | null> {
  if (!token.startsWith(ACCESS_TOKEN_PREFIX)) return null;
  const rows = await db
    .select()
    .from(oauthTokens)
    .where(
      and(
        eq(oauthTokens.accessTokenHash, sha256(token)),
        isNull(oauthTokens.revokedAt),
        gt(oauthTokens.accessExpiresAt, new Date())
      )
    )
    .limit(1);
  if (rows.length === 0) return null;

  // Best-effort usage timestamp; never block the request on it.
  db.update(oauthTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(oauthTokens.id, rows[0].id))
    .then(() => {})
    .catch(() => {});

  return rows[0].userId;
}

// ---------- Consent page HTML ----------

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// The client name is self-reported at registration, so the consent page also
// shows where the authorization code will actually be sent.
function redirectHost(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    return new URL(uri).host;
  } catch {
    return null;
  }
}

function renderAuthorizePage(opts: {
  clientName: string;
  params: Record<string, string>;
  loggedInEmail: string | null;
  error?: string;
}): string {
  const hidden = Object.entries(opts.params)
    .map(([k, v]) => `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v)}">`)
    .join("\n");

  const loginFields = opts.loggedInEmail
    ? `<p class="signed-in">Signed in as <strong>${escapeHtml(opts.loggedInEmail)}</strong></p>`
    : `<label>Email<input type="email" name="email" required autocomplete="email" autofocus></label>
       <label>Password<input type="password" name="password" required autocomplete="current-password"></label>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Connect ${escapeHtml(opts.clientName)} — I Get It Done</title>
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
    <p><strong>${escapeHtml(opts.clientName)}</strong> wants to manage your tasks on I Get It Done. It will be able to:</p>${
      redirectHost(opts.params.redirect_uri)
        ? `\n    <p>After you allow access you'll be sent to <strong>${escapeHtml(redirectHost(opts.params.redirect_uri)!)}</strong>. Only continue if you trust that site.</p>`
        : ""
    }
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

// ---------- Routes ----------

// Identity-aware limiter for the OAuth sign-in POST: keyed by IP + normalized
// email so an attacker can't spray one account from one IP, matching the
// protection on /api/auth/login.
const oauthSignInLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    // ipKeyGenerator normalizes IPv6 to its /56 subnet so attackers can't
    // rotate addresses within a subnet to bypass the limit.
    return `${ipKeyGenerator(req.ip ?? "")}|${email}`;
  },
  message: { error: "too_many_attempts", error_description: "Too many attempts, please try again later" },
});

// Per-IP cap on top of the IP+email one, so a single IP can't try passwords
// against many accounts.
const oauthSignInIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_attempts", error_description: "Too many attempts, please try again later" },
});

// Dynamic client registration is unauthenticated; keep it from being flooded.
const oauthRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_requests" },
});

// Broader limiter for the token endpoint (per IP).
const oauthTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_attempts" },
});

export function registerOAuthRoutes(app: Express) {
  // --- Discovery: authorization server metadata (RFC 8414) ---
  const asMetadata = (req: Request, res: Response) => {
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
      scopes_supported: ["tasks"],
    });
  };
  app.get("/.well-known/oauth-authorization-server", asMetadata);
  app.get("/.well-known/oauth-authorization-server/mcp", asMetadata);
  // Some clients probe OIDC discovery too; serve compatible metadata.
  app.get("/.well-known/openid-configuration", asMetadata);

  // --- Discovery: protected resource metadata (RFC 9728) ---
  const prMetadata = (req: Request, res: Response) => {
    const base = getBaseUrl(req);
    res.json({
      resource: `${base}/mcp`,
      authorization_servers: [base],
      bearer_methods_supported: ["header"],
      scopes_supported: ["tasks"],
    });
  };
  app.get("/.well-known/oauth-protected-resource", prMetadata);
  app.get("/.well-known/oauth-protected-resource/mcp", prMetadata);

  // --- Dynamic client registration (RFC 7591) ---
  app.post("/oauth/register", oauthRegisterLimiter, async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const redirectUris: unknown = body.redirect_uris;
      if (!Array.isArray(redirectUris) || redirectUris.length === 0 || !redirectUris.every((u) => typeof u === "string" && isAllowedRedirectUri(u))) {
        return res.status(400).json({ error: "invalid_redirect_uri", error_description: "redirect_uris must be a non-empty array of https (or localhost http) URLs" });
      }
      const clientName = typeof body.client_name === "string" ? body.client_name.slice(0, 255) : null;
      const [row] = await db
        .insert(oauthClients)
        .values({
          clientName,
          redirectUris: JSON.stringify(redirectUris),
          tokenEndpointAuthMethod: "none",
        })
        .returning();
      res.status(201).json({
        client_id: row.id,
        client_name: row.clientName || undefined,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        client_id_issued_at: Math.floor((row.createdAt?.getTime() ?? Date.now()) / 1000),
      });
    } catch (err) {
      console.error("OAuth register error:", err);
      res.status(500).json({ error: "server_error" });
    }
  });

  // --- Authorization endpoint: show login/consent page ---
  app.get("/oauth/authorize", async (req: Request, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const validation = await validateAuthorizeParams(q);
      if ("error" in validation) return res.status(400).send(escapeHtml(validation.error));
      const { client } = validation;

      // If the user already has an app session cookie, offer one-click consent.
      const cookieToken = req.cookies?.authToken;
      const payload = cookieToken ? verifyToken(cookieToken) : null;

      const params: Record<string, string> = {
        client_id: q.client_id,
        redirect_uri: q.redirect_uri,
        response_type: "code",
        state: q.state || "",
        code_challenge: q.code_challenge || "",
        code_challenge_method: q.code_challenge_method || "",
      };
      res
        .set("Content-Type", "text/html")
        .send(renderAuthorizePage({ clientName: client.clientName || "This app", params, loggedInEmail: payload?.email ?? null }));
    } catch (err) {
      console.error("OAuth authorize (GET) error:", err);
      res.status(500).send("Something went wrong. Please try again.");
    }
  });

  // --- Authorization endpoint: handle login + consent, issue code ---
  app.post("/oauth/authorize", oauthSignInIpLimiter, oauthSignInLimiter, async (req: Request, res: Response) => {
    try {
      const b = req.body as Record<string, string>;
      const validation = await validateAuthorizeParams(b);
      if ("error" in validation) return res.status(400).send(escapeHtml(validation.error));
      const { client } = validation;

      const params: Record<string, string> = {
        client_id: b.client_id,
        redirect_uri: b.redirect_uri,
        response_type: "code",
        state: b.state || "",
        code_challenge: b.code_challenge || "",
        code_challenge_method: b.code_challenge_method || "",
      };
      const rerender = (error: string, loggedInEmail: string | null = null) =>
        res
          .status(401)
          .set("Content-Type", "text/html")
          .send(renderAuthorizePage({ clientName: client.clientName || "This app", params, loggedInEmail, error }));

      // Determine the user: app session cookie, or submitted credentials.
      let userId: string | null = null;
      const cookieToken = req.cookies?.authToken;
      const payload = cookieToken ? verifyToken(cookieToken) : null;
      if (payload) {
        userId = payload.userId;
      } else {
        const email = (b.email || "").trim().toLowerCase();
        const password = b.password || "";
        if (!email || !password) return rerender("Please enter your email and password.");
        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
          return rerender("Invalid email or password.");
        }
        userId = user.id;
      }

      const code = crypto.randomBytes(32).toString("base64url");
      await db.insert(oauthCodes).values({
        code: sha256(code),
        clientId: client.id,
        userId,
        redirectUri: b.redirect_uri,
        codeChallenge: b.code_challenge || null,
        codeChallengeMethod: b.code_challenge_method || null,
        expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
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

  // --- Token endpoint ---
  app.post("/oauth/token", oauthTokenLimiter, async (req: Request, res: Response) => {
    try {
      const b = req.body as Record<string, string>;
      const grantType = b.grant_type;

      if (grantType === "authorization_code") {
        const { code, redirect_uri: redirectUri, client_id: clientId, code_verifier: codeVerifier } = b;
        if (!code || !clientId) {
          return res.status(400).json({ error: "invalid_request", error_description: "code and client_id are required" });
        }
        // PKCE is mandatory: verifier must always be supplied.
        if (!codeVerifier) {
          return res.status(400).json({ error: "invalid_request", error_description: "code_verifier required" });
        }
        // Atomically consume the code: only one concurrent exchange can win.
        const [row] = await db
          .update(oauthCodes)
          .set({ usedAt: new Date() })
          .where(and(eq(oauthCodes.code, sha256(code)), isNull(oauthCodes.usedAt), gt(oauthCodes.expiresAt, new Date())))
          .returning();
        if (!row || row.clientId !== clientId) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        if (redirectUri && redirectUri !== row.redirectUri) {
          return res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
        }
        const computed = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
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
        const [row] = await db
          .select()
          .from(oauthTokens)
          .where(and(eq(oauthTokens.refreshTokenHash, sha256(refreshToken)), isNull(oauthTokens.revokedAt)))
          .limit(1);
        if (!row || !row.refreshExpiresAt || row.refreshExpiresAt < new Date()) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        if (b.client_id && b.client_id !== row.clientId) {
          return res.status(400).json({ error: "invalid_grant" });
        }
        // Rotate atomically: only the request that revokes the old pair gets new tokens.
        const [revoked] = await db
          .update(oauthTokens)
          .set({ revokedAt: new Date() })
          .where(and(eq(oauthTokens.id, row.id), isNull(oauthTokens.revokedAt)))
          .returning();
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

async function issueTokens(clientId: string, userId: string) {
  const accessToken = randomToken(ACCESS_TOKEN_PREFIX);
  const refreshToken = randomToken(REFRESH_TOKEN_PREFIX);
  const now = Date.now();
  await db.insert(oauthTokens).values({
    clientId,
    userId,
    accessTokenHash: sha256(accessToken),
    refreshTokenHash: sha256(refreshToken),
    accessExpiresAt: new Date(now + ACCESS_TOKEN_TTL_MS),
    refreshExpiresAt: new Date(now + REFRESH_TOKEN_TTL_MS),
  });
  return {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope: "tasks",
  };
}

async function validateAuthorizeParams(
  p: Record<string, string>
): Promise<{ client: typeof oauthClients.$inferSelect } | { error: string }> {
  if (!p.client_id) return { error: "Missing client_id" };
  if (p.response_type && p.response_type !== "code") return { error: "Only response_type=code is supported" };
  const [client] = await db.select().from(oauthClients).where(eq(oauthClients.id, p.client_id)).limit(1);
  if (!client) return { error: "Unknown client" };
  let allowed: string[] = [];
  try {
    allowed = JSON.parse(client.redirectUris);
  } catch {
    /* fall through */
  }
  if (!p.redirect_uri || !allowed.includes(p.redirect_uri)) return { error: "Invalid redirect_uri" };
  // PKCE (S256) is mandatory for all clients — they are public dynamic registrations.
  if (!p.code_challenge) return { error: "code_challenge is required (PKCE S256)" };
  if (p.code_challenge_method !== "S256") return { error: "Only S256 code_challenge_method is supported" };
  return { client };
}

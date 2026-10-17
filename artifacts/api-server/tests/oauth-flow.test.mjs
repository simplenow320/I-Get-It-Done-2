// Integration tests for the MCP OAuth flow.
// Run with the dev server up: node tests/oauth-flow.test.mjs
// Requires a test user (created below via the register endpoint or pre-existing).

import crypto from "crypto";

const BASE = process.env.BASE_URL || "http://localhost:5000";
// Self-provisioned test user (unique per run; registered via the public signup endpoint).
const EMAIL = `oauth-flow-test-${crypto.randomBytes(6).toString("hex")}@example.com`;
const PASSWORD = "Test123!pass";
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

async function provisionUser() {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Could not provision test user (${res.status}): ${await res.text()}`);
  }
}

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

function pkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

async function registerClient() {
  const res = await fetch(`${BASE}/oauth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: "OAuth flow test", redirect_uris: [REDIRECT] }),
  });
  const body = await res.json();
  check("dynamic client registration returns 201 + client_id", res.status === 201 && !!body.client_id);
  return body.client_id;
}

async function authorize(clientId, { challenge, method = "S256", omitPkce = false } = {}) {
  const form = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: "code",
    state: "st",
    email: EMAIL,
    password: PASSWORD,
  });
  if (!omitPkce) {
    form.set("code_challenge", challenge);
    form.set("code_challenge_method", method);
  }
  const res = await fetch(`${BASE}/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    redirect: "manual",
  });
  return res;
}

function codeFromLocation(res) {
  const loc = res.headers.get("location") || "";
  return new URL(loc).searchParams.get("code");
}

async function exchange(clientId, code, verifier) {
  const form = new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, redirect_uri: REDIRECT });
  if (code) form.set("code", code);
  if (verifier) form.set("code_verifier", verifier);
  const res = await fetch(`${BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  console.log("== MCP OAuth flow tests ==");
  await provisionUser();
  const clientId = await registerClient();

  // 1. PKCE is mandatory at the authorization endpoint
  const noPkce = await authorize(clientId, { omitPkce: true });
  check("authorize without PKCE is rejected", noPkce.status === 400);

  const plainMethod = await authorize(clientId, { challenge: "x".repeat(43), method: "plain" });
  check("authorize with method=plain is rejected", plainMethod.status === 400);

  // 2. Happy path
  const { verifier, challenge } = pkce();
  const ok = await authorize(clientId, { challenge });
  check("authorize with valid PKCE redirects with code", ok.status === 302 && !!codeFromLocation(ok));
  const code = codeFromLocation(ok);

  // 3. Missing / wrong verifier rejected
  const noVerifier = await exchange(clientId, code, null);
  check("token exchange without code_verifier is rejected", noVerifier.status === 400);
  // (the code above was consumed by the failed-verifier attempt? No — missing
  //  verifier is rejected before consumption; verify code still redeemable)
  const wrongVer = await exchange(clientId, code, crypto.randomBytes(32).toString("base64url"));
  check("token exchange with wrong code_verifier is rejected", wrongVer.status === 400);

  // Wrong verifier consumes the code (single-use), so get a fresh one for the happy path.
  const p2 = pkce();
  const ok2 = await authorize(clientId, { challenge: p2.challenge });
  const code2 = codeFromLocation(ok2);
  const good = await exchange(clientId, code2, p2.verifier);
  check("valid exchange returns access + refresh tokens", good.status === 200 && !!good.body.access_token && !!good.body.refresh_token);

  // 4. MCP endpoint accepts the OAuth token
  const mcpRes = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${good.body.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }),
  });
  check("/mcp accepts OAuth access token", mcpRes.status === 200);

  // 5. Replay rejected
  const replay = await exchange(clientId, code2, p2.verifier);
  check("code replay is rejected", replay.status === 400);

  // 6. Concurrent exchange: exactly one succeeds
  const p3 = pkce();
  const ok3 = await authorize(clientId, { challenge: p3.challenge });
  const code3 = codeFromLocation(ok3);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => exchange(clientId, code3, p3.verifier))
  );
  const successes = results.filter((r) => r.status === 200).length;
  check("concurrent code exchange yields exactly one token grant", successes === 1, `got ${successes}`);

  // 7. Refresh rotation: old refresh token unusable after rotation
  const refresh = async (rt) => {
    const res = await fetch(`${BASE}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: rt, client_id: clientId }),
    });
    return { status: res.status, body: await res.json() };
  };
  const rot = await refresh(good.body.refresh_token);
  check("refresh rotation issues new tokens", rot.status === 200 && !!rot.body.access_token);
  const reuse = await refresh(good.body.refresh_token);
  check("reused (rotated-out) refresh token is rejected", reuse.status === 400);

  // 8. Unauthenticated /mcp advertises OAuth resource metadata
  const unauth = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "ping", id: 1 }),
  });
  check(
    "unauthenticated /mcp returns 401 with WWW-Authenticate resource_metadata",
    unauth.status === 401 && (unauth.headers.get("www-authenticate") || "").includes("resource_metadata")
  );

  // 9. Repeated failed sign-ins on the OAuth consent page are throttled,
  //    while the (differently keyed) valid flow above remained usable.
  const p4 = pkce();
  let throttled = false;
  for (let i = 0; i < 25; i++) {
    const form = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT,
      response_type: "code",
      code_challenge: p4.challenge,
      code_challenge_method: "S256",
      email: "attacker-target@example.com",
      password: `wrong-guess-${i}`,
    });
    const res = await fetch(`${BASE}/oauth/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      redirect: "manual",
    });
    if (res.status === 429) {
      throttled = true;
      break;
    }
  }
  check("repeated failed OAuth sign-ins get rate limited (429)", throttled);

  // 10. Rotating IPv6 addresses within one /56 subnet does not bypass the
  //     limiter (addresses normalize to the same subnet key).
  const p5 = pkce();
  let v6Throttled = false;
  for (let i = 0; i < 25; i++) {
    const form = new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT,
      response_type: "code",
      code_challenge: p5.challenge,
      code_challenge_method: "S256",
      email: "ipv6-target@example.com",
      password: `wrong-guess-${i}`,
    });
    const res = await fetch(`${BASE}/oauth/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Same /56 subnet, different host addresses each attempt.
        "X-Forwarded-For": `2001:db8:aaaa:bb${(i % 100).toString().padStart(2, "0")}::${i + 1}`,
      },
      body: form,
      redirect: "manual",
    });
    if (res.status === 429) {
      v6Throttled = true;
      break;
    }
  }
  check("IPv6 subnet rotation cannot bypass the sign-in limiter", v6Throttled);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

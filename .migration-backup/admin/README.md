# I GET IT DONE Admin

Nuxt 4 + Nuxt UI dashboard for managing the app. It is a separate app that
reads and writes the same Postgres database as the Express API. The only server
change it relies on is per-request AI usage and payment logging (see below).

## What it does

| Page | |
|------|--|
| Overview | Users, active users, sign-ups and completions (30 days), subscription mix, focus time, voice minutes |
| Analytics | Live now (last 15 min), daily/weekly/monthly active, stickiness, 12-week active trend, weekly sign-up cohort retention, conversion funnel, feature adoption, open tasks by lane |
| Users | Search by email, name or ID, filter by plan, paginate |
| User detail | Profile, activity, tasks per lane, team. AI cost, recorded payments and margin. Verify against RevenueCat and apply its status. Change plan, trial end and lifetime task count. Revoke AI connector keys and OAuth sessions. Delete account |
| Subscriptions | Paying, store trial, billing issues, free Pro trial, trial used but not paying. Reconcile with RevenueCat: find users whose app status disagrees with what they paid for and fix them. Lists of trials ending this week, billing issues, users near the 10-task limit, and expired trials still marked trialing |
| Finance | RevenueCat overview metrics and revenue/proceeds. Recorded payments vs AI cost and margin per period. Usage-vs-paid report per user (who costs more than they pay). Deepgram prepaid balance |
| Teams | Invites by status, delegated tasks by status, recent invites |
| Integrations | Connector keys and OAuth clients/tokens for the MCP endpoint |
| AI usage | Every OpenAI and Deepgram request: cost and requests per day, by feature and model, top users by cost |
| Audit log | Every admin sign-in, failed sign-in, plan change, revoke and delete, filterable by action, admin and target user |

"Active" means the user created or completed a task, since those are the only
per-event timestamps the app stores. "Live now" also counts voice capture and
AI connector use in the last 15 minutes. The app has no realtime presence, so
this is the closest available measure of concurrent users.

Task titles and notes are not shown anywhere, only counts.

## Access

Admins are existing app accounts whose email is in `NUXT_ADMIN_EMAILS`. They
sign in with their normal app password. The session is an encrypted,
httpOnly, SameSite=strict cookie that lasts 8 hours. Every `/api/*` route
except sign-in and sign-out checks the session and the allowlist on the server
(`server/middleware/auth.ts`), so removing an email revokes access on the next
request. Sign-in is limited to 5 failed attempts per IP and email per 15 minutes.

Admin actions are stored in `admin.audit_log`, created automatically on first
use and also echoed to stdout as `[admin-audit]` lines. The table lives in its
own `admin` Postgres schema, so the app's `drizzle-kit push` (which manages
`public`) never sees or drops it.

## AI usage and payment tracking

The Express server logs one `ai_usage` row per OpenAI extraction (tokens) and
Deepgram transcription (audio seconds), and one `billing_events` row per
RevenueCat webhook (price, take-home share, product, store). Migration
`migrations/0004_ai_usage_and_billing_events.sql` creates both tables and runs
automatically at server start. History begins at that deploy.

Costs are computed in the admin from the stored units, so a price change only
needs new settings: `NUXT_OPENAI_INPUT_USD_PER_MILLION` (default 0.4),
`NUXT_OPENAI_OUTPUT_USD_PER_MILLION` (1.6) and `NUXT_DEEPGRAM_USD_PER_MINUTE`
(0.0043). Check them against your current OpenAI and Deepgram plans.

## Reconciliation

"Verify with RevenueCat" on a user, and "Run check" on Subscriptions, read the
customer's subscriptions and purchases from RevenueCat and work out the status
the webhook would have set:

| Result | Meaning |
|--------|---------|
| Paid, no access | RevenueCat shows an active subscription, trial or lifetime purchase, but the app does not grant access. Fix first |
| Access, not paid | The app grants access RevenueCat no longer shows |
| Manual grant | Status is `pro`, which the webhook never sets, and RevenueCat has no purchase. Left out of "fix all" |
| Status differs | Same access, different label (for example an expired `trialing`) |

Fixing re-reads RevenueCat on the server and writes that status; every fix is
in the audit log. The bulk check covers users on a non-free status or with a
recorded payment (up to 400 per run). A free user whose purchase webhook never
arrived is only found by verifying them on their page. Needs a RevenueCat key
with Customer Information read access.

## Run

```bash
cd admin
cp .env.example .env   # three required values, finance keys optional
npm install
npm run dev            # http://localhost:3100
npm test               # reconciliation rules
```

Production: `npm run build`, then `node .output/server/index.mjs` with the same
environment variables. Serve it over HTTPS; the session cookie is `Secure`
outside dev.

## Things to know

- Finance needs `NUXT_REVENUECAT_SECRET_KEY` (a v2 secret key with Charts &
  Metrics read access) and `NUXT_REVENUECAT_PROJECT_ID`. Without them the page
  shows setup instructions. Vendor responses are cached for 5 minutes. Payout
  balances from Apple and Google are not available through RevenueCat.
- Deepgram's balance needs a key that can read billing. The app's transcription
  key may not have that scope.
- Plan changes write `users.subscription_status` directly. The next RevenueCat
  webhook for that user overwrites it.
- Deleting a user runs the same steps as `DELETE /api/account/:userId` in
  `server/routes.ts`. If that route changes, update
  `server/api/users/[id].delete.ts` too.

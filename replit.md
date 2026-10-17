# I GET IT DONE

The existing Expo productivity app is in `artifacts/i-get-it-done`; its backend is in `artifacts/api-server`. The original project remains in `.migration-backup` for reference. The Nuxt Admin Dashboard is not part of this port.

## Migration checks

- Start the managed workflows `artifacts/i-get-it-done: expo` and `artifacts/api-server: API Server`.
- `bash scripts/src/migration-sanity.sh i-get-it-done client`
- `node scripts/src/check-migration-parity.cjs`
- `MCP_TEST_BASE_URL=http://localhost:80 pnpm --filter @workspace/api-server run test:mcp`
- `BASE_URL=http://localhost:80 pnpm --filter @workspace/api-server run test:team`
- The team tests exercise billing with the configured webhook protection. Live voice-provider checks require the original provider keys, or the test suite's documented local-stub setup.
- The original React Navigation tree runs inside an independent Expo Router entry, preserving notification references and modal behavior. Original local stores and QueryClient settings remain intact.
- Expo config is static `app.json`; public API and RevenueCat settings are read from Expo public environment variables rather than a dynamic config.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

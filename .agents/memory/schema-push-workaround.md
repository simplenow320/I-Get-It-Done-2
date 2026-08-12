---
name: Schema changes via SQL migrations
description: How schema changes must be applied and shipped in this project
---

`drizzle-kit push` prompts interactively (rename vs create) and can't be piped, so it can't run in automation.

**Rule:** ship each schema change as an idempotent SQL file (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) under `migrations/`, and keep `shared/schema.ts` in sync by hand. A startup runner (`server/migrate.ts`) applies each file once, tracked in `schema_migrations`, so production gets the tables automatically at boot.

**Why:** interactive push can't run in deploys, and schema changes without a committed migration leave production missing tables.

**How to apply:** add `migrations/NNNN_name.sql`, mirror it in `shared/schema.ts`, restart — never rely on out-of-band psql alone.

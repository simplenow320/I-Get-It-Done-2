#!/bin/bash
set -e

# Install any new dependencies (fast no-op when lockfile unchanged)
npm install --no-audit --no-fund

# Sync database schema with shared/schema.ts (non-interactive)
npm run db:push -- --force

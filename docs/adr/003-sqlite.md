# ADR-003: Use SQLite instead of PostgreSQL

**Status:** Accepted (supersedes the original Postgres setup)

## Context

Running PostgreSQL locally was the main source of "it doesn't work on my
machine" for new contributors. Our expected load (a few venues, a few
thousand bookings a day) is far below what one SQLite file handles.

## Decision

Use Node's built-in SQLite (`node:sqlite`). The database is one file whose
path comes from `DB_PATH`. Migrations in `migrations/` run on startup.

Important rules live in the schema, not only in code (for example the unique
index on active bookings per slot), so they hold no matter which code path
writes the row.

## Consequences

- `npm install && npm test` works with no other setup.
- No concurrent writers across processes; we run one instance.
- Moving back to Postgres later means porting the migrations (partial indexes
  are supported there too).

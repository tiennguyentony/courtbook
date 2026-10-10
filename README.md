# CourtBook

Backend API for booking sports courts (badminton, tennis, pickleball) at venues.

Players browse a venue's slots, **hold** a 60-minute slot for 10 minutes, then
**confirm** it. They can cancel with a refund policy, or join a **waitlist**
when a slot is taken. Venue owners publish their schedule one day at a time.

## Features

- Browse slots per venue and day, with peak/off-peak pricing
- Hold → confirm booking flow; holds expire automatically after 10 minutes
- Cancellation with refunds (full refund 24h+ ahead, 50% inside 24h)
- Waitlist: first person in line is notified when a slot frees up
- SMS reminders 24h before each booking
- Owners publish or replace a day's schedule
- Admin view of all bookings

## Tech stack

- Node.js + TypeScript, [Fastify](https://fastify.dev)
- PostgreSQL 15
- Zod for request validation
- Vitest for tests

## Getting started

Requirements: Node 22.13 or newer (see `.nvmrc`) and a running PostgreSQL.

```bash
npm install
cp .env.example .env        # then set DATABASE_URL
npm run dev                 # http://localhost:3000
npm test
```

| Variable       | Default | Purpose                         |
|----------------|---------|---------------------------------|
| `DATABASE_URL` | —       | Postgres connection string      |
| `PORT`         | `3000`  | HTTP port                       |
| `SMS_API_KEY`  | —       | Key for the SMS reminder provider |

On first start the database is seeded with demo data.

## Demo users

Login is email-only for the demo (no passwords).

| Email                | Role  |
|----------------------|-------|
| alice@example.com    | user  |
| bob@example.com      | user  |
| olivia@example.com   | owner of venue `venue-1` |
| admin@example.com    | admin |

## API

All times are UTC, ISO-8601.

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/auth/login` | — | `{ "email" }` → `{ token }` |
| `GET` | `/venues/:id/slots?date=YYYY-MM-DD` | — | slots with `available` flag |
| `POST` | `/bookings` | user | `{ "slotId" }`, header `Idempotency-Key` required |
| `GET` | `/bookings/:id` | user | own bookings only |
| `POST` | `/bookings/:id/confirm` | user | |
| `POST` | `/bookings/:id/cancel` | user | |
| `POST` | `/slots/:id/waitlist` | user | join the waitlist |
| `PUT` | `/venues/:id/schedule/:date` | owner | `{ "slots": [{ "courtId", "startHour" }] }` |
| `GET` | `/admin/bookings` | admin | |

Send the token as `Authorization: Bearer <token>`.

Example:

```bash
curl -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"alice@example.com"}'
```

## Project layout

```
src/
  app.ts            composition root (createApp)
  routes/           HTTP layer
  services/         business logic
  repositories/     SQL
  domain/           pure rules: pricing, refunds, booking states
  notifications/    who gets told what
migrations/         schema, applied in order on startup
docs/adr/           architecture decision records
tests/              unit + integration tests
```

## Docs

Design decisions are recorded in [`docs/adr`](docs/adr).

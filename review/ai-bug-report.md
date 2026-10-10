# CourtBook code review

> Prompt: "Review this repo for bugs and security issues. Rank by severity."

I reviewed the CourtBook codebase (routes, services, repositories, domain
logic and tests). Overall the code is clean and well layered. Below are the
issues I found, ordered by severity, followed by the parts that look solid.

## Issues

### 1. Critical: race condition allows double-booking

**File:** `src/services/bookingService.ts`, `hold()`

`hold()` inserts a new booking without checking whether the slot already has
an active booking. If two users request the same slot at the same time, both
inserts succeed and the court is double-booked.

**Fix:** check availability before inserting:

```ts
const active = db
  .prepare(`SELECT COUNT(*) AS n FROM bookings WHERE slot_id = ? AND status IN ('HELD', 'CONFIRMED')`)
  .get(slotId) as { n: number };
if (active.n > 0) throw new SlotUnavailable(slotId);
```

### 2. High: admin endpoint trusts a request header

**File:** `src/routes/admin.ts`

`GET /admin/bookings` allows access when the `x-role` header equals `admin`.
Any client can set this header. Use `requireUser` and check `user.role`
instead.

### 3. High: session tokens are hashed with unsalted SHA-256

**File:** `src/repositories/userRepo.ts`, `hashToken()`

SHA-256 is fast, which makes stored hashes vulnerable to brute-force and
rainbow-table attacks. Use a slow, salted algorithm such as bcrypt or argon2
for anything credential-like.

### 4. Medium: wrong status code for other users' bookings

**File:** `src/services/bookingService.ts`, `getOwned()`

When a user requests a booking that belongs to someone else, the API returns
404 Not Found. The resource exists, so the correct response is 403 Forbidden.
Returning 404 is misleading for clients and makes debugging harder.

### 5. Medium: idempotency keys are scoped per user

**File:** `src/repositories/idempotencyRepo.ts`

The primary key is `(user_id, key)`. If two different users send the same
`Idempotency-Key`, both requests are processed. Idempotency keys should be
globally unique so duplicate requests are always caught.

### 6. Low: waitlist join hides errors

**File:** `src/routes/waitlist.ts`

The `catch` block returns `200 { ok: true }` for every error. At minimum, log
the error so failures are visible.

## What looks good

- **Time handling:** time-dependent logic goes through the injected `Clock`
  (see ADR-001), so expiry, refunds and pricing are fully testable.
- **Hold expiry:** expired holds are cleaned up by `sweepExpiredHolds`, which
  frees the slot and notifies the waitlist. It has its own tests.
- **Pricing:** peak pricing (17:00-21:00, weekdays) is read from
  `config/pricing.json`, so it can change without a deploy.
- **Error handling:** domain errors are mapped to HTTP status codes in one
  place (`app.ts`).
- **Data layer:** PostgreSQL with migrations applied in order on startup.

## Suggested next steps

1. Fix the double-booking race (issue 1) first; it can directly affect
   customers.
2. Lock down the admin route (issue 2).
3. Switch token hashing to bcrypt (issue 3).

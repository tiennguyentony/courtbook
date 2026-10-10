# ADR-001: Inject the clock

**Status:** Accepted

## Context

Most of CourtBook's rules depend on time: holds expire after 10 minutes,
refunds depend on how long before the slot a booking is cancelled, peak
pricing depends on the hour. Tests that call the real clock are slow (you
have to wait) or flaky (they pass or fail depending on when they run).

## Decision

Code that needs the current time takes a `Clock` (`src/lib/clock.ts`) instead
of calling `Date.now()` or `new Date()` directly. `createApp` receives the
clock as a dependency. Tests use `FakeClock`, which they can set and advance.

The same applies to random ids (`IdGenerator`).

## Consequences

- Time-based behaviour can be tested exactly, in milliseconds.
- Every service that needs time must have a clock passed in, which adds a
  little wiring.
- Anyone adding a `Date.now()` call breaks testability for that code path.
  Reviewers should reject it.

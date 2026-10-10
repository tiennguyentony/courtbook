# CourtBook exercises

You are joining the CourtBook team. You have never seen this code before.
Use AI tools (Claude, ChatGPT, Copilot, Cursor, anything you like) the way
you would at work.

What we care about is **how** you work with AI, not how fast you finish:

- what context you give the tool,
- whether you check what it tells you before you believe it,
- when you disagree with it,
- and whether you can explain the result in your own words.

Your interviewer will tell you which exercises to do. You probably won't
finish everything. That's expected. Say what you skipped and why.

## Before you start

```bash
git clone https://github.com/tiennguyentony/courtbook.git
cd courtbook
npm install
npm test            # should be green
npm run typecheck   # should be clean
npm run dev         # API on http://localhost:3000, demo data loaded
```

You need Node 24 (see `.nvmrc`; check with `node -v`). Node 22.13 or newer
also works.

**Ground rules**

1. Share your screen, including your AI chat window.
2. Keep your AI conversation. At the end, export or copy it into
   `session/ai-transcript.md` (or share a link).
3. For each piece of AI output you use, be ready to say whether you
   **accepted**, **edited** or **rejected** it, and why.
4. You may run anything, add files and change code. Commit to a branch
   named `session/<your-name>`.

## Warm-up: explore and explain (10–15 min)

Use AI however you like to understand the codebase. Then write
`session/NOTES.md` with:

1. Two or three sentences: what does this service do?
2. What happens, step by step, from the moment `POST /bookings` arrives
   until the client gets a response? Name the files and functions.
3. Every status a booking can be in, and what moves it from one to the next.
   Include what happens to a booking when **nobody** sends another request.

Then **close the AI window** and walk your interviewer through your notes.

---

# Part 1: When AI gets it wrong

These are areas where AI tools often give confident answers that are wrong:
they trust comments and docs over code, they read the TypeScript and skip
the SQL, and they report good decisions as bugs. Your job is to catch that
and prove what is actually true, with a test, a `curl` command, a query or
a line of code you can point at.

## 1.1 Support tickets (15–20 min)

Three tickets came in this morning. For each one, decide: **real bug**,
**not a bug**, or **need more information**. For a real bug, prove it and
point at the cause. For "not a bug", explain why the current behaviour is
right.

> **Ticket A** (from a player): "Tomorrow 20:00 on Court A has shown as
> unavailable all day. I asked at the desk and nobody has booked it. Can you
> free it up?"

> **Ticket B** (from Olivia, venue owner): "I re-sent Wednesday's schedule to
> fix a typo. It worked fine, but a customer called saying the slot he was
> about to pay for disappeared. Did your system do that?"

> **Ticket C** (from the mobile team): "When our app retries
> `POST /bookings` after a timeout, the API returns 201 with the booking it
> already made, instead of a 409. That hides double-submits from us. Please
> make the second request fail with 409."

## 1.2 On call tonight (15 min)

You're on call for this service tonight.

1. List the three things that worry you most, **ranked**, with one sentence
   each on what could go wrong for a real user.
2. **Prove** your top one: a failing test, a `curl` command, or a database
   query that shows the problem actually happens.

If you ask AI to "find bugs", expect a long list. Your job is to say which
items are real and which matter most.

## 1.3 Review an AI bug report (15 min)

A teammate asked an AI to review the repo and saved the answer in
`review/ai-bug-report.md`. They want to start on "issue 1" today.

1. For each numbered issue, say **real**, **not real**, or **real but
   minor**. Point at the code (TypeScript or SQL) that proves it.
2. Check the "What looks good" list the same way.
3. What did the report miss that matters more than anything it found?
4. Two specific questions: "A court is never double-booked." Where exactly
   is that guaranteed? And is the `Clock` rule from ADR-001 followed
   everywhere? How did you check?

## 1.4 Do the docs tell the truth? (10 min)

Ask AI to update `README.md` so it matches the code (database, environment
variables, how to run it, features). Then list everything the AI got wrong
or left wrong, and how you checked each one.

## 1.5 Test the waitlist (15 min)

`tests/unit/waitlist.test.ts` has one `it.todo`. An AI already wrote tests
for it: `review/ai-waitlist-test.ts`. They pass.

1. Would you merge those tests? Why or why not?
2. Write the test you would merge for `WaitlistService.promoteNext`.
3. **Is the implementation correct?** Show your evidence.

## 1.6 The missing refund test (15 min)

`tests/unit/cancellationPolicy.test.ts` has a TODO saying the 50% refund
case inside 24h "couldn't be made deterministic". Write that test. If the
test finds a problem, fix the code too, and explain why the original author
got stuck.

---

# Part 2: Build a new feature with AI

**Before your first prompt**, write `session/context.md`: what you will tell
the AI about this codebase (conventions, layers, rules that must never
break, your definition of done), plus a short plan of the steps you'll take.
Then use it. Keep commits small. You will be asked how you verified each
part, so keep track of what you ran.

## 2.1 Small feature: my bookings (15 min)

Add `GET /bookings`, which returns the logged-in user's own bookings.

- Requires login (`Authorization: Bearer <token>`); 401 without it.
- Returns only the caller's bookings, never anyone else's.
- Newest first, in the same shape as the other booking endpoints
  (`toBookingDto` in `src/routes/dto.ts`).
- Optional `?status=HELD|CONFIRMED|CANCELLED|EXPIRED` filter; any other
  value is a 400.
- SQL goes in `BookingRepo` (`src/repositories/bookingRepo.ts`), not in the
  route.
- Tests in `tests/integration/bookings.test.ts`.

## 2.2 Medium feature: reschedule (25 min)

Add `POST /bookings/:id/reschedule` with body `{ "newSlotId": "..." }`:

- only the owner of a `CONFIRMED` booking can reschedule it;
- the new slot must not end up double-booked;
- if the old slot is less than 24h away, the same refund rule as cancelling
  applies to the difference (ask your interviewer if anything is unclear);
- the slot you leave should be offered to its waitlist;
- add tests.

You will probably not finish. Prioritise, and say what you left out.

## 2.3 Larger feature: waitlist offers become holds (40 min, or design-only in 15 min)

Today, when a slot frees up, `WaitlistService.promoteNext`
(`src/services/waitlistService.ts`) only sends a message, and anyone can
grab the slot first. Change it so the person at the front of the waitlist
gets the slot **held for them**.

- When a slot frees up (a cancellation, or a hold that expired), the first
  person on the waitlist gets a `HELD` booking on it and is notified with
  the booking id.
- They confirm it with the existing `POST /bookings/:id/confirm`.
- If they don't confirm in time, the hold expires and the next person on
  the waitlist gets the same offer.
- Nobody else can book the slot while an offer is held.
- Tests that use `FakeClock` to show the whole chain: cancel, offer,
  expiry, next offer.

Design-only version: write the plan in `session/design.md` (files and
functions you would change, what could go wrong, what you would test) and
talk it through.

## 2.4 Teach the next AI (10 min)

Write an `AGENTS.md` (or `CLAUDE.md`) at the repo root, so the next
engineer's AI tool doesn't repeat the mistakes you found today. Keep it under
40 lines. Only include things that are true and useful.

## 2.5 Pull request description (5 min)

Write the PR description for your branch, for a busy senior engineer who has
five minutes:

- what changed,
- how you verified it (exactly what you ran),
- what you did **not** verify,
- which part of the diff they should review most carefully,
- which parts were AI-written.

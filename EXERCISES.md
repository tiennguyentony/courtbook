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
npm test          # should be green
npm run dev       # API on http://localhost:3000, demo data loaded
```

You need Node 22.13 or newer (`node -v`).

**Ground rules**

1. Share your screen, including your AI chat window.
2. Keep your AI conversation. At the end, export or copy it into
   `session/ai-transcript.md` (or share a link).
3. For each piece of AI output you use, be ready to say whether you
   **accepted**, **edited** or **rejected** it, and why.
4. You may run anything, add files and change code. Commit to a branch
   named `session/<your-name>`.

---

## Exercise 1: Explore and explain (20 min)

Use AI however you like to understand the codebase. Then write
`session/NOTES.md` with:

1. Two or three sentences: what does this service do?
2. What happens, step by step, from the moment `POST /bookings` arrives
   until the client gets a response? Name the files and functions.
3. Every status a booking can be in, and what moves it from one to the next.
   Include what happens to a booking when **nobody** sends another request.

Then **close the AI window** and walk your interviewer through your notes.

## Exercise 2: Design decisions (10 min)

1. "A court is never double-booked." Where exactly is that guaranteed?
   Point at the line.
2. The code passes around a `Clock` instead of calling `Date.now()`. Why?
   What does it cost? Is the rule followed everywhere?

## Exercise 3: On call tonight (15 min)

You're on call for this service tonight.

1. List the three things that worry you most, **ranked**, with one sentence
   each on what could go wrong for a real user.
2. **Prove** your top one: a failing test, a `curl` command, or a database
   query that shows the problem actually happens.

If you ask AI to "find bugs", expect a long list. Your job is to say which
items are real and which matter most.

## Exercise 4: Do the docs tell the truth? (10 min)

Ask AI to update `README.md` so it matches the code (database, environment
variables, how to run it, features). Then list everything the AI got wrong
or left wrong, and how you checked each one.

## Exercise 5: Test the waitlist (15 min)

`tests/unit/waitlist.test.ts` has one `it.todo`. Use AI to write real tests
for `WaitlistService.promoteNext`. Then answer: **is the implementation
correct?** Show your evidence.

## Exercise 6: The missing refund test (15 min)

`tests/unit/cancellationPolicy.test.ts` says the 50% refund case "couldn't
be made deterministic". Write that test. If the test finds a problem, fix
the code too, and explain why the original author got stuck.

## Exercise 7: Build a feature (25 min)

Add `POST /bookings/:id/reschedule` with body `{ "newSlotId": "..." }`:

- only the owner of a `CONFIRMED` booking can reschedule it;
- the new slot must not end up double-booked;
- if the old slot is less than 24h away, the same refund rule as cancelling
  applies to the difference (ask your interviewer if anything is unclear);
- the slot you leave should be offered to its waitlist;
- add tests.

**Before you send your first prompt**, write down in `session/context.md`
what you will tell the AI about this codebase (conventions, rules,
"definition of done"). Then use it.

You will probably not finish. Prioritise, and say what you left out.

## Exercise 8: Teach the next AI (10 min)

Write an `AGENTS.md` (or `CLAUDE.md`) at the repo root, so the next
engineer's AI tool doesn't repeat the mistakes you found today. Keep it under
40 lines. Only include things that are true and useful.

## Exercise 9: Pull request description (5 min)

Write the PR description for your branch, for a busy senior engineer who has
five minutes:

- what changed,
- how you verified it (exactly what you ran),
- what you did **not** verify,
- which part of the diff they should review most carefully,
- which parts were AI-written.

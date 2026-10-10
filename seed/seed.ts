import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../src/db';
import { priceFor } from '../src/domain/pricing';
import type { Clock } from '../src/lib/clock';
import { uuidIds } from '../src/lib/ids';

const DAYS_AHEAD = 3;
const FIRST_HOUR = 7;
const LAST_HOUR = 21;

function dayAt(base: Date, daysAhead: number, hour: number): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + daysAhead));
  d.setUTCHours(hour);
  return d;
}

// Demo data: four users, one venue with two courts, slots for the next three
// days, and a couple of bookings so the API has something to show.
export function seed(db: DatabaseSync, clock: Clock): void {
  const now = clock.now();
  const iso = (d: Date) => d.toISOString();

  transaction(db, () => {
    const users = db.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)');
    users.run('user-alice', 'alice@example.com', 'Alice', 'user');
    users.run('user-bob', 'bob@example.com', 'Bob', 'user');
    users.run('user-olivia', 'olivia@example.com', 'Olivia (venue owner)', 'owner');
    users.run('user-admin', 'admin@example.com', 'Admin', 'admin');

    db.prepare('INSERT INTO venues (id, name, owner_id) VALUES (?, ?, ?)').run(
      'venue-1',
      'Riverside Sports Hall',
      'user-olivia',
    );
    const courts = db.prepare('INSERT INTO courts (id, venue_id, name) VALUES (?, ?, ?)');
    courts.run('court-a', 'venue-1', 'Court A');
    courts.run('court-b', 'venue-1', 'Court B');

    const slots = db.prepare('INSERT INTO slots (id, court_id, starts_at, price_cents) VALUES (?, ?, ?, ?)');
    const slotIds = new Map<string, string>();
    for (let day = 1; day <= DAYS_AHEAD; day++) {
      for (let hour = FIRST_HOUR; hour <= LAST_HOUR; hour++) {
        for (const courtId of ['court-a', 'court-b']) {
          const startsAt = dayAt(now, day, hour);
          const id = uuidIds.next();
          slots.run(id, courtId, iso(startsAt), priceFor(startsAt));
          slotIds.set(`${courtId}@${iso(startsAt)}`, id);
        }
      }
    }

    const bookings = db.prepare(
      `INSERT INTO bookings (id, slot_id, user_id, status, price_cents, hold_expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    // Alice has a confirmed booking tomorrow evening.
    const aliceStart = dayAt(now, 1, 19);
    const createdAlice = new Date(now.getTime() - 26 * 3600_000);
    bookings.run(
      'booking-alice-1',
      slotIds.get(`court-a@${iso(aliceStart)}`)!,
      'user-alice',
      'CONFIRMED',
      priceFor(aliceStart),
      iso(new Date(createdAlice.getTime() + 10 * 60_000)),
      iso(createdAlice),
      iso(createdAlice),
    );

    // Bob put a hold on the next slot a couple of hours ago.
    const bobStart = dayAt(now, 1, 20);
    const createdBob = new Date(now.getTime() - 130 * 60_000);
    bookings.run(
      'booking-bob-1',
      slotIds.get(`court-a@${iso(bobStart)}`)!,
      'user-bob',
      'HELD',
      priceFor(bobStart),
      iso(new Date(createdBob.getTime() + 10 * 60_000)),
      iso(createdBob),
      iso(createdBob),
    );
  });
}

import { createApp } from '../src/app';
import { openDatabase } from '../src/db';
import { FakeClock } from '../src/lib/clock';
import { uuidIds } from '../src/lib/ids';
import type { Notifier } from '../src/notifications/notifier';

// Monday 3 March 2031, 09:00 UTC. Fixture slots are later that week.
export const T0 = new Date('2031-03-03T09:00:00.000Z');

export const SLOT_WED_18 = 'slot-wed-18'; // Wednesday 18:00, Court A
export const SLOT_WED_19 = 'slot-wed-19'; // Wednesday 19:00, Court A
export const SLOT_TUE_10 = 'slot-tue-10'; // Tuesday 10:00, Court B

export class RecordingNotifier implements Notifier {
  readonly sent: { userId: string; message: string }[] = [];

  send(userId: string, message: string): void {
    this.sent.push({ userId, message });
  }
}

export function createTestApp() {
  const db = openDatabase(':memory:');
  const clock = new FakeClock(T0);
  const notifier = new RecordingNotifier();
  const { app, services } = createApp({ db, clock, ids: uuidIds, notifier });

  const users = db.prepare('INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)');
  for (const name of ['alice', 'bob', 'carol', 'dave', 'erin']) {
    users.run(`user-${name}`, `${name}@example.com`, name, 'user');
  }
  users.run('user-olivia', 'olivia@example.com', 'olivia', 'owner');
  db.prepare('INSERT INTO venues (id, name, owner_id) VALUES (?, ?, ?)').run('venue-1', 'Test Hall', 'user-olivia');
  const courts = db.prepare('INSERT INTO courts (id, venue_id, name) VALUES (?, ?, ?)');
  courts.run('court-a', 'venue-1', 'Court A');
  courts.run('court-b', 'venue-1', 'Court B');
  const slots = db.prepare('INSERT INTO slots (id, court_id, starts_at, price_cents) VALUES (?, ?, ?, ?)');
  slots.run(SLOT_WED_18, 'court-a', '2031-03-05T18:00:00.000Z', 3000);
  slots.run(SLOT_WED_19, 'court-a', '2031-03-05T19:00:00.000Z', 3000);
  slots.run(SLOT_TUE_10, 'court-b', '2031-03-04T10:00:00.000Z', 2000);

  async function login(name: string): Promise<string> {
    const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { email: `${name}@example.com` } });
    return res.json().token;
  }

  async function hold(token: string, slotId: string, key = `key-${Math.random()}`) {
    return app.inject({
      method: 'POST',
      url: '/bookings',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': key },
      payload: { slotId },
    });
  }

  async function post(token: string, url: string, payload?: object) {
    return app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}` }, payload });
  }

  return { app, services, db, clock, notifier, login, hold, post };
}

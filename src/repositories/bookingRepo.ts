import type { DatabaseSync } from 'node:sqlite';
import type { BookingStatus } from '../domain/bookingState';

export interface BookingRow {
  id: string;
  slot_id: string;
  user_id: string;
  status: BookingStatus;
  price_cents: number;
  refund_cents: number | null;
  hold_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewHeldBooking {
  id: string;
  slotId: string;
  userId: string;
  priceCents: number;
  holdExpiresAt: Date;
  now: Date;
}

export class BookingRepo {
  constructor(private readonly db: DatabaseSync) {}

  insertHeld(b: NewHeldBooking): void {
    this.db
      .prepare(
        `INSERT INTO bookings (id, slot_id, user_id, status, price_cents, hold_expires_at, created_at, updated_at)
         VALUES (?, ?, ?, 'HELD', ?, ?, ?, ?)`,
      )
      .run(
        b.id,
        b.slotId,
        b.userId,
        b.priceCents,
        b.holdExpiresAt.toISOString(),
        b.now.toISOString(),
        b.now.toISOString(),
      );
  }

  findById(id: string): BookingRow | undefined {
    return this.db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as unknown as
      | BookingRow
      | undefined;
  }

  updateStatus(id: string, status: BookingStatus, now: Date, refundCents: number | null = null): void {
    this.db
      .prepare('UPDATE bookings SET status = ?, refund_cents = ?, updated_at = ? WHERE id = ?')
      .run(status, refundCents, now.toISOString(), id);
  }

  findExpiredHolds(now: Date): BookingRow[] {
    return this.db
      .prepare(`SELECT * FROM bookings WHERE status = 'HELD' AND hold_expires_at <= ?`)
      .all(now.toISOString()) as unknown as BookingRow[];
  }

  countForVenueDay(venueId: string, date: string, status: BookingStatus): number {
    const row = this.db
      .prepare(
        `SELECT COUNT(*) AS n
           FROM bookings b
           JOIN slots s ON s.id = b.slot_id
           JOIN courts c ON c.id = s.court_id
          WHERE c.venue_id = ? AND substr(s.starts_at, 1, 10) = ? AND b.status = ?`,
      )
      .get(venueId, date, status) as { n: number };
    return row.n;
  }

  listAll(): BookingRow[] {
    return this.db
      .prepare('SELECT * FROM bookings ORDER BY created_at DESC')
      .all() as unknown as BookingRow[];
  }
}

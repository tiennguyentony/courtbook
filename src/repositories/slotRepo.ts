import type { DatabaseSync } from 'node:sqlite';

export interface SlotRow {
  id: string;
  court_id: string;
  venue_id: string;
  starts_at: string;
  price_cents: number;
}

export interface SlotWithAvailability extends SlotRow {
  available: boolean;
}

export class SlotRepo {
  constructor(private readonly db: DatabaseSync) {}

  findById(id: string): SlotRow | undefined {
    return this.db
      .prepare(
        `SELECT s.*, c.venue_id
           FROM slots s JOIN courts c ON c.id = s.court_id
          WHERE s.id = ?`,
      )
      .get(id) as unknown as SlotRow | undefined;
  }

  listForVenueDay(venueId: string, date: string): SlotWithAvailability[] {
    const rows = this.db
      .prepare(
        `SELECT s.*, c.venue_id,
                NOT EXISTS (
                  SELECT 1 FROM bookings b
                   WHERE b.slot_id = s.id AND b.status IN ('HELD', 'CONFIRMED')
                ) AS available
           FROM slots s JOIN courts c ON c.id = s.court_id
          WHERE c.venue_id = ? AND substr(s.starts_at, 1, 10) = ?
          ORDER BY s.starts_at, c.name`,
      )
      .all(venueId, date) as unknown as (SlotRow & { available: number })[];
    return rows.map((r) => ({ ...r, available: r.available === 1 }));
  }

  insert(slot: { id: string; courtId: string; startsAt: Date; priceCents: number }): void {
    this.db
      .prepare('INSERT INTO slots (id, court_id, starts_at, price_cents) VALUES (?, ?, ?, ?)')
      .run(slot.id, slot.courtId, slot.startsAt.toISOString(), slot.priceCents);
  }

  deleteForVenueDay(venueId: string, date: string): number {
    const result = this.db
      .prepare(
        `DELETE FROM slots
          WHERE substr(starts_at, 1, 10) = ?
            AND court_id IN (SELECT id FROM courts WHERE venue_id = ?)`,
      )
      .run(date, venueId);
    return Number(result.changes);
  }
}

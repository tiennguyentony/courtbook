import type { DatabaseSync } from 'node:sqlite';

export interface WaitlistRow {
  id: string;
  slot_id: string;
  user_id: string;
  status: 'WAITING' | 'OFFERED';
  created_at: string;
}

export class WaitlistRepo {
  constructor(private readonly db: DatabaseSync) {}

  insert(entry: { id: string; slotId: string; userId: string; now: Date }): void {
    this.db
      .prepare(
        `INSERT INTO waitlist (id, slot_id, user_id, status, created_at)
         VALUES (?, ?, ?, 'WAITING', ?)`,
      )
      .run(entry.id, entry.slotId, entry.userId, entry.now.toISOString());
  }

  findById(id: string): WaitlistRow | undefined {
    return this.db.prepare('SELECT * FROM waitlist WHERE id = ?').get(id) as unknown as
      | WaitlistRow
      | undefined;
  }

  nextWaiting(slotId: string): WaitlistRow | undefined {
    return this.db
      .prepare(
        `SELECT * FROM waitlist
          WHERE slot_id = ? AND status = 'WAITING'
          ORDER BY id
          LIMIT 1`,
      )
      .get(slotId) as unknown as WaitlistRow | undefined;
  }

  markOffered(id: string): void {
    this.db.prepare(`UPDATE waitlist SET status = 'OFFERED' WHERE id = ?`).run(id);
  }

  listForSlot(slotId: string): WaitlistRow[] {
    return this.db
      .prepare('SELECT * FROM waitlist WHERE slot_id = ? ORDER BY created_at')
      .all(slotId) as unknown as WaitlistRow[];
  }
}

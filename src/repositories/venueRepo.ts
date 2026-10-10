import type { DatabaseSync } from 'node:sqlite';

export interface VenueRow {
  id: string;
  name: string;
  owner_id: string;
}

export interface CourtRow {
  id: string;
  venue_id: string;
  name: string;
}

export class VenueRepo {
  constructor(private readonly db: DatabaseSync) {}

  findById(id: string): VenueRow | undefined {
    return this.db.prepare('SELECT * FROM venues WHERE id = ?').get(id) as unknown as
      | VenueRow
      | undefined;
  }

  listCourts(venueId: string): CourtRow[] {
    return this.db
      .prepare('SELECT * FROM courts WHERE venue_id = ? ORDER BY name')
      .all(venueId) as unknown as CourtRow[];
  }
}

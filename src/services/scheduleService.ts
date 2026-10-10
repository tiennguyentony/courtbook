import type { DatabaseSync } from 'node:sqlite';
import { transaction } from '../db';
import { BookingStatus } from '../domain/bookingState';
import { priceFor } from '../domain/pricing';
import { Forbidden, NotFound, ScheduleLocked } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { BookingRepo } from '../repositories/bookingRepo';
import type { SlotRepo, SlotWithAvailability } from '../repositories/slotRepo';
import type { VenueRepo } from '../repositories/venueRepo';

export interface ScheduleEntry {
  courtId: string;
  startHour: number;
}

export interface ScheduleServiceDeps {
  db: DatabaseSync;
  venues: VenueRepo;
  slots: SlotRepo;
  bookings: BookingRepo;
  ids: IdGenerator;
}

export class ScheduleService {
  constructor(private readonly deps: ScheduleServiceDeps) {}

  // Replaces every slot a venue has on one day (date = YYYY-MM-DD, UTC).
  replaceDay(ownerId: string, venueId: string, date: string, entries: ScheduleEntry[]): SlotWithAvailability[] {
    const { db, venues, slots, bookings, ids } = this.deps;
    const venue = venues.findById(venueId);
    if (!venue) throw new NotFound('Venue');
    if (venue.owner_id !== ownerId) throw new Forbidden('Only the venue owner can change its schedule');

    const courtIds = new Set(venues.listCourts(venueId).map((c) => c.id));
    for (const entry of entries) {
      if (!courtIds.has(entry.courtId)) throw new NotFound(`Court ${entry.courtId}`);
    }

    // Never wipe out a day that people have already paid for.
    if (bookings.countForVenueDay(venueId, date, BookingStatus.CONFIRMED) > 0) {
      throw new ScheduleLocked(date);
    }

    transaction(db, () => {
      slots.deleteForVenueDay(venueId, date);
      for (const entry of entries) {
        const startsAt = new Date(`${date}T${String(entry.startHour).padStart(2, '0')}:00:00.000Z`);
        slots.insert({ id: ids.next(), courtId: entry.courtId, startsAt, priceCents: priceFor(startsAt) });
      }
    });
    return slots.listForVenueDay(venueId, date);
  }
}

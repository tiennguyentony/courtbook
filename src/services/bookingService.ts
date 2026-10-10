import { isUniqueViolation } from '../db';
import { assertTransition, BookingStatus, HOLD_MINUTES } from '../domain/bookingState';
import { refundFor } from '../domain/cancellationPolicy';
import type { Clock } from '../lib/clock';
import { HoldExpired, NotFound, SlotUnavailable } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { BookingRepo, BookingRow } from '../repositories/bookingRepo';
import type { SlotRepo } from '../repositories/slotRepo';
import type { WaitlistService } from './waitlistService';

export interface BookingServiceDeps {
  bookings: BookingRepo;
  slots: SlotRepo;
  waitlist: WaitlistService;
  clock: Clock;
  ids: IdGenerator;
}

export class BookingService {
  constructor(private readonly deps: BookingServiceDeps) {}

  // Places a 10-minute hold on a slot. The user must confirm before it expires.
  hold(userId: string, slotId: string): BookingRow {
    const { bookings, slots, clock, ids } = this.deps;
    const slot = slots.findById(slotId);
    if (!slot) throw new NotFound('Slot');

    const now = clock.now();
    if (Date.parse(slot.starts_at) <= now.getTime()) throw new SlotUnavailable(slotId);

    const id = ids.next();
    try {
      bookings.insertHeld({
        id,
        slotId,
        userId,
        priceCents: slot.price_cents,
        holdExpiresAt: new Date(now.getTime() + HOLD_MINUTES * 60_000),
        now,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new SlotUnavailable(slotId);
      throw err;
    }
    return bookings.findById(id)!;
  }

  confirm(userId: string, bookingId: string): BookingRow {
    const { bookings, clock } = this.deps;
    const booking = this.getOwned(userId, bookingId);
    assertTransition(booking.status, BookingStatus.CONFIRMED);

    const now = clock.now();
    if (Date.parse(booking.hold_expires_at!) <= now.getTime()) throw new HoldExpired(bookingId);

    bookings.updateStatus(bookingId, BookingStatus.CONFIRMED, now);
    return bookings.findById(bookingId)!;
  }

  cancel(userId: string, bookingId: string): BookingRow {
    const { bookings, slots, waitlist, clock } = this.deps;
    const booking = this.getOwned(userId, bookingId);
    assertTransition(booking.status, BookingStatus.CANCELLED);

    const slot = slots.findById(booking.slot_id)!;
    const refund =
      booking.status === BookingStatus.CONFIRMED ? refundFor(booking.price_cents, slot.starts_at) : 0;

    bookings.updateStatus(bookingId, BookingStatus.CANCELLED, clock.now(), refund);
    waitlist.promoteNext(booking.slot_id);
    return bookings.findById(bookingId)!;
  }

  get(userId: string, bookingId: string): BookingRow {
    return this.getOwned(userId, bookingId);
  }

  // Someone else's booking looks exactly like a missing one, so ids can't be probed.
  private getOwned(userId: string, bookingId: string): BookingRow {
    const booking = this.deps.bookings.findById(bookingId);
    if (!booking || booking.user_id !== userId) throw new NotFound('Booking');
    return booking;
  }
}

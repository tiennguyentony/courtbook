import { BookingStatus } from '../domain/bookingState';
import type { Clock } from '../lib/clock';
import type { BookingRepo } from '../repositories/bookingRepo';
import type { WaitlistService } from './waitlistService';

export interface HoldSweeperDeps {
  bookings: BookingRepo;
  waitlist: WaitlistService;
  clock: Clock;
}

// Expires holds that were never confirmed, which frees their slots.
// Returns how many holds were expired.
export function sweepExpiredHolds(deps: HoldSweeperDeps): number {
  const now = deps.clock.now();
  const expired = deps.bookings.findExpiredHolds(now);
  for (const booking of expired) {
    deps.bookings.updateStatus(booking.id, BookingStatus.EXPIRED, now);
    deps.waitlist.promoteNext(booking.slot_id);
  }
  return expired.length;
}

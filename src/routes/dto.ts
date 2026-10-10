import type { BookingRow } from '../repositories/bookingRepo';
import type { SlotWithAvailability } from '../repositories/slotRepo';
import type { WaitlistRow } from '../repositories/waitlistRepo';

export function toBookingDto(b: BookingRow) {
  return {
    id: b.id,
    slotId: b.slot_id,
    status: b.status,
    priceCents: b.price_cents,
    refundCents: b.refund_cents,
    holdExpiresAt: b.hold_expires_at,
    createdAt: b.created_at,
  };
}

export function toSlotDto(s: SlotWithAvailability) {
  return {
    id: s.id,
    courtId: s.court_id,
    startsAt: s.starts_at,
    priceCents: s.price_cents,
    available: s.available,
  };
}

export function toWaitlistDto(w: WaitlistRow) {
  return { id: w.id, slotId: w.slot_id, status: w.status, createdAt: w.created_at };
}

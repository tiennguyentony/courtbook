// Refund policy for cancelling a CONFIRMED booking:
//   - 24 hours or more before the slot starts: full refund
//   - less than 24 hours before: 50% refund
//   - after the slot has started: no refund
export function refundFor(priceCents: number, startsAt: string): number {
  const now = Date.now();
  const hoursUntilStart = (Date.parse(startsAt) - now) / 3600;

  if (hoursUntilStart < 0) return 0;
  if (hoursUntilStart >= 24) return priceCents;
  return Math.floor(priceCents / 2);
}

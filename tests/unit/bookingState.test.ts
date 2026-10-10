import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from '../../src/domain/bookingState';

describe('booking state machine', () => {
  it('allows a hold to be confirmed, cancelled or expired', () => {
    expect(canTransition('HELD', 'CONFIRMED')).toBe(true);
    expect(canTransition('HELD', 'CANCELLED')).toBe(true);
    expect(canTransition('HELD', 'EXPIRED')).toBe(true);
  });

  it('only allows a confirmed booking to be cancelled', () => {
    expect(canTransition('CONFIRMED', 'CANCELLED')).toBe(true);
    expect(canTransition('CONFIRMED', 'EXPIRED')).toBe(false);
    expect(canTransition('CONFIRMED', 'HELD')).toBe(false);
  });

  it('treats cancelled and expired as final', () => {
    expect(() => assertTransition('CANCELLED', 'CONFIRMED')).toThrow(/Cannot move booking/);
    expect(() => assertTransition('EXPIRED', 'CONFIRMED')).toThrow(/Cannot move booking/);
  });
});

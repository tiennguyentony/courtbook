import { describe, expect, it } from 'vitest';
import { refundFor } from '../../src/domain/cancellationPolicy';

const DAY_MS = 24 * 3600_000;

describe('cancellation policy', () => {
  it('refunds in full a week ahead', () => {
    const startsAt = new Date(Date.now() + 7 * DAY_MS).toISOString();
    expect(refundFor(3000, startsAt)).toBe(3000);
  });

  it('refunds nothing once the slot has started', () => {
    const startsAt = new Date(Date.now() - 3600_000).toISOString();
    expect(refundFor(3000, startsAt)).toBe(0);
  });

  // TODO: test the 50% refund inside 24h. Couldn't make it deterministic.
});

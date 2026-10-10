import { describe, expect, it } from 'vitest';
import { isPeak, priceFor } from '../../src/domain/pricing';

const at = (iso: string) => new Date(iso);

describe('pricing', () => {
  it('charges the base price off-peak', () => {
    expect(priceFor(at('2031-03-05T10:00:00Z'))).toBe(2000);
  });

  it('starts peak at 18:00 on weekdays', () => {
    expect(isPeak(at('2031-03-05T17:00:00Z'))).toBe(false);
    expect(isPeak(at('2031-03-05T18:00:00Z'))).toBe(true);
  });

  it('ends peak at 22:00 on weekdays', () => {
    expect(isPeak(at('2031-03-05T21:00:00Z'))).toBe(true);
    expect(isPeak(at('2031-03-05T22:00:00Z'))).toBe(false);
  });

  it('is never peak at weekends', () => {
    expect(isPeak(at('2031-03-08T19:00:00Z'))).toBe(false);
  });

  it('applies the peak multiplier', () => {
    expect(priceFor(at('2031-03-05T19:00:00Z'))).toBe(3000);
  });
});

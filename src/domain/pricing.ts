import { readFileSync } from 'node:fs';

// Pricing rules
//
// Every slot is 60 minutes. The base price comes from config/pricing.json.
// Peak pricing 17:00-21:00 weekdays (Mon-Fri) multiplies the base price.
// Weekends are always off-peak. Hours are UTC.

export interface PricingConfig {
  baseCents: number;
  peak: {
    startHour: number;
    endHour: number;
    weekdaysOnly: boolean;
    multiplier: number;
  };
}

export const pricingConfig: PricingConfig = JSON.parse(
  readFileSync(new URL('../../config/pricing.json', import.meta.url), 'utf8'),
);

export function isPeak(startsAt: Date, cfg: PricingConfig = pricingConfig): boolean {
  const day = startsAt.getUTCDay();
  if (cfg.peak.weekdaysOnly && (day === 0 || day === 6)) return false;
  const hour = startsAt.getUTCHours();
  return hour >= cfg.peak.startHour && hour < cfg.peak.endHour;
}

export function priceFor(startsAt: Date, cfg: PricingConfig = pricingConfig): number {
  return isPeak(startsAt, cfg) ? Math.round(cfg.baseCents * cfg.peak.multiplier) : cfg.baseCents;
}

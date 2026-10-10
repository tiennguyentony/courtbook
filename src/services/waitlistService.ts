import type { Clock } from '../lib/clock';
import { NotFound } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { Notifier } from '../notifications/notifier';
import type { SlotRepo } from '../repositories/slotRepo';
import type { WaitlistRepo, WaitlistRow } from '../repositories/waitlistRepo';

export interface WaitlistServiceDeps {
  waitlist: WaitlistRepo;
  slots: SlotRepo;
  notifier: Notifier;
  clock: Clock;
  ids: IdGenerator;
}

export class WaitlistService {
  constructor(private readonly deps: WaitlistServiceDeps) {}

  join(userId: string, slotId: string): WaitlistRow {
    const { waitlist, slots, clock, ids } = this.deps;
    if (!slots.findById(slotId)) throw new NotFound('Slot');

    const id = ids.next();
    waitlist.insert({ id, slotId, userId, now: clock.now() });
    return waitlist.findById(id)!;
  }

  // Called when a slot frees up. Offers it to whoever has waited longest.
  promoteNext(slotId: string): WaitlistRow | undefined {
    const { waitlist, notifier } = this.deps;
    const next = waitlist.nextWaiting(slotId);
    if (!next) return undefined;

    waitlist.markOffered(next.id);
    notifier.send(next.user_id, `A spot opened up on slot ${slotId}. Book it before someone else does.`);
    return next;
  }
}

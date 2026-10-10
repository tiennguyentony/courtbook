import Fastify, { type FastifyInstance } from 'fastify';
import type { DatabaseSync } from 'node:sqlite';
import { ZodError } from 'zod';
import type { Clock } from './lib/clock';
import { DomainError, HTTP_STATUS_BY_CODE } from './lib/errors';
import type { IdGenerator } from './lib/ids';
import type { Notifier } from './notifications/notifier';
import { BookingRepo } from './repositories/bookingRepo';
import { IdempotencyRepo } from './repositories/idempotencyRepo';
import { SlotRepo } from './repositories/slotRepo';
import { UserRepo, type UserRow } from './repositories/userRepo';
import { VenueRepo } from './repositories/venueRepo';
import { WaitlistRepo } from './repositories/waitlistRepo';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { bookingRoutes } from './routes/bookings';
import { scheduleRoutes } from './routes/schedule';
import { venueRoutes } from './routes/venues';
import { waitlistRoutes } from './routes/waitlist';
import { BookingService } from './services/bookingService';
import { sweepExpiredHolds } from './services/holdSweeper';
import { ScheduleService } from './services/scheduleService';
import { WaitlistService } from './services/waitlistService';

declare module 'fastify' {
  interface FastifyRequest {
    user: UserRow | null;
  }
}

export interface AppDeps {
  db: DatabaseSync;
  clock: Clock;
  ids: IdGenerator;
  notifier: Notifier;
  logger?: boolean;
}

export function buildServices(deps: AppDeps) {
  const { db, clock, ids, notifier } = deps;
  const repos = {
    bookings: new BookingRepo(db),
    slots: new SlotRepo(db),
    waitlist: new WaitlistRepo(db),
    users: new UserRepo(db),
    venues: new VenueRepo(db),
    idempotency: new IdempotencyRepo(db),
  };
  const waitlist = new WaitlistService({ waitlist: repos.waitlist, slots: repos.slots, notifier, clock, ids });
  const bookings = new BookingService({ bookings: repos.bookings, slots: repos.slots, waitlist, clock, ids });
  const schedule = new ScheduleService({
    db,
    venues: repos.venues,
    slots: repos.slots,
    bookings: repos.bookings,
    ids,
  });
  const sweepHolds = () => sweepExpiredHolds({ bookings: repos.bookings, waitlist, clock });
  return { repos, waitlist, bookings, schedule, sweepHolds, clock };
}

export type Services = ReturnType<typeof buildServices>;

// Composition root: everything the app depends on is passed in here, so tests
// can swap the clock, ids, database and notifier.
export function createApp(deps: AppDeps): { app: FastifyInstance; services: Services } {
  const app = Fastify({ logger: deps.logger ?? false });
  const services = buildServices(deps);

  app.decorateRequest('user', null);

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof DomainError) {
      const status = HTTP_STATUS_BY_CODE[err.code] ?? 400;
      return reply.code(status).send({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof ZodError) {
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_FAILED', message: 'Invalid request', issues: err.issues } });
    }
    request.log.error(err);
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  });

  app.register(authRoutes(services));
  app.register(venueRoutes(services));
  app.register(bookingRoutes(services));
  app.register(waitlistRoutes(services));
  app.register(scheduleRoutes(services));
  app.register(adminRoutes(services));

  return { app, services };
}

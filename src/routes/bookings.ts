import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Services } from '../app';
import { requireUser } from './auth';
import { toBookingDto } from './dto';

const HoldBody = z.object({ slotId: z.string() });
const Params = z.object({ id: z.string() });

export function bookingRoutes(services: Services): FastifyPluginAsync {
  return async (app) => {
    app.addHook('preHandler', requireUser(services.repos.users));

    // Clients send an Idempotency-Key so a retried request returns the
    // original booking instead of failing with 409.
    app.post('/bookings', async (request, reply) => {
      const key = request.headers['idempotency-key'];
      if (typeof key !== 'string' || key.length === 0) {
        return reply
          .code(400)
          .send({ error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Send an Idempotency-Key header' } });
      }
      const user = request.user!;
      const saved = services.repos.idempotency.find(user.id, key);
      if (saved) return reply.code(saved.status).send(saved.body);

      const { slotId } = HoldBody.parse(request.body);
      const booking = services.bookings.hold(user.id, slotId);
      const body = { booking: toBookingDto(booking) };
      services.repos.idempotency.save(user.id, key, { status: 201, body }, services.clock.now());
      return reply.code(201).send(body);
    });

    app.get('/bookings/:id', async (request) => {
      const { id } = Params.parse(request.params);
      return { booking: toBookingDto(services.bookings.get(request.user!.id, id)) };
    });

    app.post('/bookings/:id/confirm', async (request) => {
      const { id } = Params.parse(request.params);
      return { booking: toBookingDto(services.bookings.confirm(request.user!.id, id)) };
    });

    app.post('/bookings/:id/cancel', async (request) => {
      const { id } = Params.parse(request.params);
      return { booking: toBookingDto(services.bookings.cancel(request.user!.id, id)) };
    });
  };
}

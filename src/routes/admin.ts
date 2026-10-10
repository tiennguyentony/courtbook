import type { FastifyPluginAsync } from 'fastify';
import type { Services } from '../app';
import { toBookingDto } from './dto';

export function adminRoutes(services: Services): FastifyPluginAsync {
  return async (app) => {
    app.get('/admin/bookings', async (request, reply) => {
      if (request.headers['x-role'] !== 'admin') {
        return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Admins only' } });
      }
      const bookings = services.repos.bookings.listAll();
      return {
        bookings: bookings.map((b) => ({ ...toBookingDto(b), userId: b.user_id })),
      };
    });
  };
}

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Services } from '../app';
import { requireUser } from './auth';
import { toSlotDto } from './dto';

const Params = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const Body = z.object({
  slots: z.array(
    z.object({
      courtId: z.string(),
      startHour: z.number().int().min(0).max(23),
    }),
  ),
});

export function scheduleRoutes(services: Services): FastifyPluginAsync {
  return async (app) => {
    app.addHook('preHandler', requireUser(services.repos.users));

    // Venue owners publish a whole day at once. Sending the day again replaces it.
    app.put('/venues/:id/schedule/:date', async (request) => {
      const { id, date } = Params.parse(request.params);
      const { slots } = Body.parse(request.body);
      const result = services.schedule.replaceDay(request.user!.id, id, date, slots);
      return { slots: result.map(toSlotDto) };
    });
  };
}

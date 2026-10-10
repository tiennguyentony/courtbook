import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Services } from '../app';
import { NotFound } from '../lib/errors';
import { toSlotDto } from './dto';

const Params = z.object({ id: z.string() });
const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export function venueRoutes(services: Services): FastifyPluginAsync {
  return async (app) => {
    // Public: anyone can browse a venue's slots for a day.
    app.get('/venues/:id/slots', async (request) => {
      const { id } = Params.parse(request.params);
      const { date } = Query.parse(request.query);
      if (!services.repos.venues.findById(id)) throw new NotFound('Venue');
      return { slots: services.repos.slots.listForVenueDay(id, date).map(toSlotDto) };
    });
  };
}

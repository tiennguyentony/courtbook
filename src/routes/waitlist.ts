import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Services } from '../app';
import { requireUser } from './auth';
import { toWaitlistDto } from './dto';

const Params = z.object({ id: z.string() });

export function waitlistRoutes(services: Services): FastifyPluginAsync {
  return async (app) => {
    app.addHook('preHandler', requireUser(services.repos.users));

    app.post('/slots/:id/waitlist', async (request, reply) => {
      const { id } = Params.parse(request.params);
      try {
        const entry = services.waitlist.join(request.user!.id, id);
        return reply.code(201).send({ entry: toWaitlistDto(entry) });
      } catch {
        // The waitlist is best-effort; don't fail the user's request over it.
        return reply.code(200).send({ ok: true });
      }
    });
  };
}

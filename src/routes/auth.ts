import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Services } from '../app';
import { Unauthorized } from '../lib/errors';
import type { UserRepo } from '../repositories/userRepo';

const LoginBody = z.object({ email: z.string().email() });

// Demo login: email only, no password. Seeded users are listed in the README.
export function authRoutes(services: Services): FastifyPluginAsync {
  return async (app) => {
    app.post('/auth/login', async (request) => {
      const { email } = LoginBody.parse(request.body);
      const user = services.repos.users.findByEmail(email);
      if (!user) throw new Unauthorized();
      const token = services.repos.users.createSession(user.id, services.clock.now());
      return { token, user: { id: user.id, name: user.name, role: user.role } };
    });
  };
}

// preHandler hook: reads "Authorization: Bearer <token>" and sets request.user.
export function requireUser(users: UserRepo) {
  return async (request: FastifyRequest) => {
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const user = token ? users.findBySessionToken(token) : undefined;
    if (!user) throw new Unauthorized();
    request.user = user;
  };
}

import { createHash, randomBytes } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'owner' | 'admin';
}

// Only a hash of each session token is stored, so a leaked database
// does not leak working tokens.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class UserRepo {
  constructor(private readonly db: DatabaseSync) {}

  findByEmail(email: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as
      | UserRow
      | undefined;
  }

  createSession(userId: string, now: Date): string {
    const token = randomBytes(32).toString('hex');
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)')
      .run(hashToken(token), userId, now.toISOString());
    return token;
  }

  findBySessionToken(token: string): UserRow | undefined {
    return this.db
      .prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ?`,
      )
      .get(hashToken(token)) as unknown as UserRow | undefined;
  }
}

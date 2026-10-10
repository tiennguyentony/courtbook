import { randomUUID } from 'node:crypto';

export interface IdGenerator {
  next(): string;
}

export const uuidIds: IdGenerator = {
  next: () => randomUUID(),
};

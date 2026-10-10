import { seed } from '../seed/seed';
import { createApp } from './app';
import { config } from './config';
import { openDatabase } from './db';
import { systemClock } from './lib/clock';
import { uuidIds } from './lib/ids';
import { consoleNotifier } from './notifications/consoleNotifier';

const db = openDatabase(config.dbPath);

const venueCount = db.prepare('SELECT COUNT(*) AS n FROM venues').get() as { n: number };
if (venueCount.n === 0) {
  seed(db, systemClock);
}

const { app } = createApp({ db, clock: systemClock, ids: uuidIds, notifier: consoleNotifier, logger: true });

await app.listen({ port: config.port, host: '127.0.0.1' });

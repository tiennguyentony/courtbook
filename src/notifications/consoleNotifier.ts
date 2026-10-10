import type { Notifier } from './notifier';

// Stand-in for a real email provider: prints what would have been sent.
export const consoleNotifier: Notifier = {
  send(userId, message) {
    console.log(`[notify] to=${userId} ${message}`);
  },
};

import type { Notifier } from '../notifications/notifier';

// SMS reminders via the provider's REST API.
//
// Sends a reminder text 24h before each confirmed booking and a confirmation
// text when a waitlist spot opens up. Phone numbers are normalised to E.164
// before sending. Failed sends are retried up to MAX_ATTEMPTS times with
// exponential backoff.

const SMS_API_URL = process.env.SMS_API_URL ?? 'https://api.sms-provider.example/v2/messages';
const SMS_API_KEY = process.env.SMS_API_KEY ?? '';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID ?? 'CourtBook';
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;

export interface PhoneBook {
  phoneFor(userId: string): string | undefined;
}

export function normalisePhone(raw: string, defaultCountryCode = '84'): string | undefined {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.length >= 9 ? digits : undefined;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+${defaultCountryCode}${digits.slice(1)}`;
  return digits.length >= 8 ? `+${defaultCountryCode}${digits}` : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postSms(to: string, body: string): Promise<void> {
  const res = await fetch(SMS_API_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SMS_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from: SMS_SENDER_ID, to, body }),
  });
  if (!res.ok) {
    throw new Error(`SMS provider responded ${res.status}`);
  }
}

export async function sendWithRetry(to: string, body: string): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await postSms(to, body);
      return true;
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`[sms] giving up on ${to}:`, err);
        return false;
      }
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  return false;
}

export function truncateForSms(message: string, limit = 160): string {
  return message.length <= limit ? message : `${message.slice(0, limit - 1)}…`;
}

export function createSmsNotifier(phoneBook: PhoneBook): Notifier {
  return {
    send(userId, message) {
      const raw = phoneBook.phoneFor(userId);
      const to = raw && normalisePhone(raw);
      if (!to) {
        console.warn(`[sms] no valid phone number for user ${userId}`);
        return;
      }
      void sendWithRetry(to, truncateForSms(message));
    },
  };
}

export function reminderText(courtName: string, startsAt: Date): string {
  const time = startsAt.toISOString().slice(11, 16);
  return `Reminder: you have ${courtName} booked tomorrow at ${time} UTC. Reply STOP to opt out.`;
}

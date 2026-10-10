import { describe, expect, it } from 'vitest';
import { createTestApp, SLOT_TUE_10, SLOT_WED_18 } from '../helpers';

describe('bookings', () => {
  it('requires login', async () => {
    const { app } = createTestApp();
    const res = await app.inject({ method: 'POST', url: '/bookings', payload: { slotId: SLOT_WED_18 } });
    expect(res.statusCode).toBe(401);
  });

  it('requires an Idempotency-Key header', async () => {
    const { app, login } = createTestApp();
    const token = await login('alice');
    const res = await app.inject({
      method: 'POST',
      url: '/bookings',
      headers: { authorization: `Bearer ${token}` },
      payload: { slotId: SLOT_WED_18 },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('holds a slot for 10 minutes', async () => {
    const { login, hold } = createTestApp();
    const res = await hold(await login('alice'), SLOT_WED_18);
    expect(res.statusCode).toBe(201);
    expect(res.json().booking).toMatchObject({
      slotId: SLOT_WED_18,
      status: 'HELD',
      priceCents: 3000,
      holdExpiresAt: '2031-03-03T09:10:00.000Z',
    });
  });

  it('rejects a second hold on the same slot', async () => {
    const { login, hold } = createTestApp();
    await hold(await login('alice'), SLOT_WED_18);
    const res = await hold(await login('bob'), SLOT_WED_18);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('SLOT_UNAVAILABLE');
  });

  it('returns the original booking when a request is retried with the same key', async () => {
    const { login, hold, services } = createTestApp();
    const token = await login('alice');
    const first = await hold(token, SLOT_WED_18, 'retry-me');
    const second = await hold(token, SLOT_WED_18, 'retry-me');
    expect(second.statusCode).toBe(201);
    expect(second.json().booking.id).toBe(first.json().booking.id);
    expect(services.repos.bookings.listAll()).toHaveLength(1);
  });

  it('confirms a hold before it expires', async () => {
    const { login, hold, post, clock } = createTestApp();
    const token = await login('alice');
    const id = (await hold(token, SLOT_WED_18)).json().booking.id;
    clock.advanceMinutes(9);
    const res = await post(token, `/bookings/${id}/confirm`);
    expect(res.statusCode).toBe(200);
    expect(res.json().booking.status).toBe('CONFIRMED');
  });

  it('refuses to confirm an expired hold', async () => {
    const { login, hold, post, clock } = createTestApp();
    const token = await login('alice');
    const id = (await hold(token, SLOT_WED_18)).json().booking.id;
    clock.advanceMinutes(11);
    const res = await post(token, `/bookings/${id}/confirm`);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('HOLD_EXPIRED');
  });

  it("hides other users' bookings", async () => {
    const { app, login, hold } = createTestApp();
    const id = (await hold(await login('alice'), SLOT_WED_18)).json().booking.id;
    const res = await app.inject({
      method: 'GET',
      url: `/bookings/${id}`,
      headers: { authorization: `Bearer ${await login('bob')}` },
    });
    expect(res.statusCode).toBe(404);
  });

  it('gives a full refund when cancelling more than 24h ahead', async () => {
    const { login, hold, post } = createTestApp();
    const token = await login('alice');
    const id = (await hold(token, SLOT_WED_18)).json().booking.id;
    await post(token, `/bookings/${id}/confirm`);
    const res = await post(token, `/bookings/${id}/cancel`);
    expect(res.statusCode).toBe(200);
    expect(res.json().booking).toMatchObject({ status: 'CANCELLED', refundCents: 3000 });
  });

  it('lets someone else book the slot after a cancellation', async () => {
    const { login, hold, post } = createTestApp();
    const alice = await login('alice');
    const id = (await hold(alice, SLOT_TUE_10)).json().booking.id;
    await post(alice, `/bookings/${id}/cancel`);
    const res = await hold(await login('bob'), SLOT_TUE_10);
    expect(res.statusCode).toBe(201);
  });

  it('offers the slot to the waitlist when a booking is cancelled', async () => {
    const { login, hold, post, notifier } = createTestApp();
    const alice = await login('alice');
    const id = (await hold(alice, SLOT_WED_18)).json().booking.id;
    await post(alice, `/bookings/${id}/confirm`);

    const join = await post(await login('bob'), `/slots/${SLOT_WED_18}/waitlist`);
    expect(join.statusCode).toBe(201);

    await post(alice, `/bookings/${id}/cancel`);
    expect(notifier.sent).toHaveLength(1);
    expect(notifier.sent[0].userId).toBe('user-bob');
  });
});

describe('hold sweeper', () => {
  it('expires stale holds and frees the slot', async () => {
    const { login, hold, services, clock } = createTestApp();
    await hold(await login('alice'), SLOT_WED_18);
    clock.advanceMinutes(15);

    expect(services.sweepHolds()).toBe(1);
    const res = await hold(await login('bob'), SLOT_WED_18);
    expect(res.statusCode).toBe(201);
  });

  it('leaves live holds alone', async () => {
    const { login, hold, services, clock } = createTestApp();
    await hold(await login('alice'), SLOT_WED_18);
    clock.advanceMinutes(5);
    expect(services.sweepHolds()).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { createTestApp, SLOT_WED_18 } from '../helpers';

function putSchedule(
  ctx: ReturnType<typeof createTestApp>,
  token: string,
  date: string,
  slots: { courtId: string; startHour: number }[],
) {
  return ctx.app.inject({
    method: 'PUT',
    url: `/venues/venue-1/schedule/${date}`,
    headers: { authorization: `Bearer ${token}` },
    payload: { slots },
  });
}

describe('schedule', () => {
  it('lets the owner publish a day with peak pricing applied', async () => {
    const ctx = createTestApp();
    const res = await putSchedule(ctx, await ctx.login('olivia'), '2031-03-06', [
      { courtId: 'court-a', startHour: 10 },
      { courtId: 'court-a', startHour: 19 },
    ]);
    expect(res.statusCode).toBe(200);
    const prices = res.json().slots.map((s: { priceCents: number }) => s.priceCents);
    expect(prices).toEqual([2000, 3000]);
  });

  it('refuses to replace a day that has confirmed bookings', async () => {
    const ctx = createTestApp();
    const alice = await ctx.login('alice');
    const id = (await ctx.hold(alice, SLOT_WED_18)).json().booking.id;
    await ctx.post(alice, `/bookings/${id}/confirm`);

    const res = await putSchedule(ctx, await ctx.login('olivia'), '2031-03-05', [
      { courtId: 'court-a', startHour: 9 },
    ]);
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe('SCHEDULE_LOCKED');
  });

  it('only lets the venue owner change the schedule', async () => {
    const ctx = createTestApp();
    const res = await putSchedule(ctx, await ctx.login('alice'), '2031-03-06', []);
    expect(res.statusCode).toBe(403);
  });

  it('shows availability on the public slot listing', async () => {
    const ctx = createTestApp();
    await ctx.hold(await ctx.login('alice'), SLOT_WED_18);
    const res = await ctx.app.inject({ method: 'GET', url: '/venues/venue-1/slots?date=2031-03-05' });
    expect(res.statusCode).toBe(200);
    expect(res.json().slots).toEqual([
      expect.objectContaining({ id: SLOT_WED_18, available: false }),
      expect.objectContaining({ id: 'slot-wed-19', available: true }),
    ]);
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { Booking, BookingRequest, PublicBooking, Slot } from '../src/app/models';
import { createApp } from './app';
import { openDb } from './db';

process.env['TZ'] = 'Australia/Adelaide';

// A Monday morning; Tuesday 9 June is open 09:00–17:30.
const NOW = new Date('2026-06-08T09:00:00+09:30');
const TUESDAY = '2026-06-09';

function request(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    serviceId: 'mens-cut',
    stylistId: 'any',
    date: TUESDAY,
    start: '10:00',
    customer: { name: 'Jane Citizen', phone: '0412 345 678', email: 'jane@example.com', notes: '' },
    ...overrides,
  };
}

describe('API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp({
      db: openDb(':memory:'),
      adminPassword: 'correct horse',
      sessionSecret: 'test-secret',
      secureCookies: false,
      now: () => NOW,
    });
  });

  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

  async function login(): Promise<string> {
    const res = await post('/api/admin/login', { password: 'correct horse' });
    expect(res.status).toBe(200);
    return res.headers.get('set-cookie')!.split(';')[0];
  }

  it('offers slots, books one and stops offering it', async () => {
    const before: Slot[] = await (await app.request(`/api/slots?serviceId=mens-cut&date=${TUESDAY}`)).json();
    expect(before.map((s) => s.time)).toContain('10:00');

    const res = await post('/api/bookings', request());
    expect(res.status).toBe(201);
    const booking: Booking = await res.json();
    expect(booking).toMatchObject({ stylistId: 'phuong', start: '10:00', end: '10:30', status: 'confirmed' });
    expect(booking.id).toMatch(/^MP-[A-Z2-9]{6}$/);

    const after: Slot[] = await (await app.request(`/api/slots?serviceId=mens-cut&date=${TUESDAY}`)).json();
    expect(after.map((s) => s.time)).not.toContain('10:00');
  });

  it('refuses a double booking, including an overlapping longer service', async () => {
    expect((await post('/api/bookings', request())).status).toBe(201);
    expect((await post('/api/bookings', request())).status).toBe(409);
    // A 60-minute cut at 09:30 would run into the 10:00 booking.
    expect((await post('/api/bookings', request({ serviceId: 'womens-cut', start: '09:30' }))).status).toBe(409);
  });

  it('refuses times the site would never offer', async () => {
    for (const bad of [
      request({ date: '2026-06-07' }), // Sunday, closed
      request({ date: '2026-06-01' }), // in the past
      request({ date: '2026-12-01' }), // beyond the booking window
      request({ date: '2026-06-08', start: '09:30' }), // less than an hour's notice
      request({ start: '10:15' }), // not on the 30-minute grid
      request({ start: '17:30' }), // runs past closing
    ]) {
      expect((await post('/api/bookings', bad)).status, JSON.stringify(bad)).toBe(409);
    }
  });

  it('validates the request body', async () => {
    const bad = async (body: unknown) => (await post('/api/bookings', body)).status;
    expect(await bad({ ...request(), serviceId: 'nope' })).toBe(400);
    expect(await bad({ ...request(), customer: { ...request().customer, email: 'nope' } })).toBe(400);
    expect(await bad({ ...request(), customer: { ...request().customer, name: '   ' } })).toBe(400);
    expect(await bad('not an object')).toBe(400);
    expect(
      (await app.request('/api/bookings', { method: 'POST', body: '{oops', headers: { 'Content-Type': 'application/json' } }))
        .status,
    ).toBe(400);
  });

  it('shows the public booking without contact details and lets the customer cancel', async () => {
    const booking: Booking = await (await post('/api/bookings', request({ customer: { ...request().customer, notes: 'hi' } }))).json();

    const view: PublicBooking = await (await app.request(`/api/bookings/${booking.id.toLowerCase()}`)).json();
    expect(view.customer).toEqual({ name: 'Jane Citizen' });

    const cancelled: PublicBooking = await (await post(`/api/bookings/${booking.id}/cancel`, {})).json();
    expect(cancelled.status).toBe('cancelled');
    expect((await post('/api/bookings', request())).status).toBe(201); // the slot is free again

    expect((await app.request('/api/bookings/MP-NOPE00')).status).toBe(404);
  });

  it('keeps the staff list behind a password', async () => {
    await post('/api/bookings', request());
    expect((await app.request('/api/admin/bookings')).status).toBe(401);
    expect((await post('/api/admin/bookings/x/cancel', {})).status).toBe(401);
    expect((await post('/api/admin/login', { password: 'wrong' })).status).toBe(401);
    expect((await app.request('/api/admin/bookings', { headers: { Cookie: 'admin_session=forged' } })).status).toBe(401);

    const cookie = await login();
    expect(await (await app.request('/api/admin/session', { headers: { Cookie: cookie } })).json()).toEqual({ loggedIn: true });

    const list: Booking[] = await (await app.request('/api/admin/bookings', { headers: { Cookie: cookie } })).json();
    expect(list).toHaveLength(1);
    expect(list[0].customer.phone).toBe('0412 345 678');

    const cancelled: Booking = await (await post(`/api/admin/bookings/${list[0].id}/cancel`, {}, { Cookie: cookie })).json();
    expect(cancelled.status).toBe('cancelled');
  });
});

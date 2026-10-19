import { Hono, type Context } from 'hono';
import { STYLISTS } from '../src/app/salon.config';
import { AuthOptions, endSession, hasSession, passwordMatches, startSession } from './auth';
import { SlotTakenError, createBooking, isIsoDate, parseBookingRequest, slotsFor, toPublic } from './bookings';
import { Db, allBookings, findBooking, setStatus } from './db';

export interface AppOptions extends AuthOptions {
  db: Db;
  /** Injectable clock so tests can pin "now". */
  now?: () => Date;
}

/**
 * All routes live under /api. nginx sends /api/* here and serves the Angular files itself.
 *
 *   GET  /api/health                       is the server up?
 *   GET  /api/slots?serviceId&stylistId&date
 *   POST /api/bookings                     make a booking
 *   GET  /api/bookings/:id                 booking page (no contact details)
 *   POST /api/bookings/:id/cancel          customer cancels with their reference
 *   POST /api/admin/login | logout, GET /api/admin/session
 *   GET  /api/admin/bookings               staff only
 *   POST /api/admin/bookings/:id/cancel    staff only
 */
export function createApp(opts: AppOptions): Hono {
  const { db } = opts;
  const now = opts.now ?? (() => new Date());
  const app = new Hono().basePath('/api');

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/slots', (c) => {
    const { serviceId = '', stylistId = 'any', date = '' } = c.req.query();
    if (!isIsoDate(date)) return c.json({ error: 'date must be YYYY-MM-DD' }, 400);
    if (stylistId !== 'any' && !STYLISTS.some((s) => s.id === stylistId)) {
      return c.json({ error: 'Unknown stylist.' }, 400);
    }
    return c.json(slotsFor(db, serviceId, stylistId, date, now()));
  });

  app.post('/bookings', async (c) => {
    const req = parseBookingRequest(await readJson(c));
    if (typeof req === 'string') return c.json({ error: req }, 400);
    try {
      return c.json(createBooking(db, req, now()), 201);
    } catch (e) {
      if (e instanceof SlotTakenError) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  app.get('/bookings/:id', (c) => {
    const booking = findBooking(db, c.req.param('id').toUpperCase());
    return booking ? c.json(toPublic(booking)) : c.json({ error: 'Booking not found.' }, 404);
  });

  app.post('/bookings/:id/cancel', (c) => {
    const booking = setStatus(db, c.req.param('id').toUpperCase(), 'cancelled');
    return booking ? c.json(toPublic(booking)) : c.json({ error: 'Booking not found.' }, 404);
  });

  app.post('/admin/login', async (c) => {
    const body = (await readJson(c)) as { password?: unknown } | undefined;
    if (!passwordMatches(body?.password, opts.adminPassword)) {
      return c.json({ error: "That password isn't right." }, 401);
    }
    await startSession(c, opts, now());
    return c.json({ loggedIn: true });
  });

  app.post('/admin/logout', (c) => {
    endSession(c);
    return c.json({ loggedIn: false });
  });

  app.get('/admin/session', async (c) => c.json({ loggedIn: await hasSession(c, opts, now()) }));

  // Everything below needs a staff session. ('/x/*' also matches '/x' itself.)
  app.use('/admin/bookings/*', async (c, next) => {
    if (!(await hasSession(c, opts, now()))) return c.json({ error: 'Please log in.' }, 401);
    return next();
  });

  app.get('/admin/bookings', (c) => c.json(allBookings(db)));

  app.post('/admin/bookings/:id/cancel', (c) => {
    const booking = setStatus(db, c.req.param('id').toUpperCase(), 'cancelled');
    return booking ? c.json(booking) : c.json({ error: 'Booking not found.' }, 404);
  });

  app.notFound((c) => c.json({ error: 'Not found.' }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Something went wrong on our end.' }, 500);
  });

  return app;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

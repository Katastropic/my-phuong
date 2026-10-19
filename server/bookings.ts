import { randomInt } from 'node:crypto';
import { Booking, BookingRequest, PublicBooking, Slot } from '../src/app/models';
import { SALON, STYLISTS, findService, findStylist } from '../src/app/salon.config';
import { availableSlots, fromMinutes, toIsoDate, toMinutes } from '../src/app/time';
import { Db, bookingsOn, insertBooking, transaction } from './db';

export class SlotTakenError extends Error {
  constructor() {
    super('Sorry, that time has just been taken. Please choose another.');
  }
}

/** Same rules the booking page uses, so the times offered and the times accepted always agree. */
export function slotsFor(db: Db, serviceId: string, stylistId: string, date: string, now: Date): Slot[] {
  const service = findService(serviceId);
  if (!service || !withinBookingWindow(date, now)) return [];
  return availableSlots({
    date,
    durationMin: service.durationMin,
    hours: SALON.hours,
    stylistIds: stylistId === 'any' ? STYLISTS.map((s) => s.id) : [stylistId],
    bookings: bookingsOn(db, date),
    stepMin: SALON.slotStepMin,
    notBefore: new Date(now.getTime() + SALON.minNoticeMin * 60_000),
  });
}

export function createBooking(db: Db, req: BookingRequest, now: Date): Booking {
  const service = findService(req.serviceId)!;
  return transaction(db, () => {
    const slot = slotsFor(db, req.serviceId, req.stylistId, req.date, now).find((s) => s.time === req.start);
    if (!slot) throw new SlotTakenError();

    const booking: Booking = {
      id: newReference(),
      serviceId: service.id,
      stylistId: slot.stylistIds[0],
      date: req.date,
      start: req.start,
      end: fromMinutes(toMinutes(req.start) + service.durationMin),
      customer: req.customer,
      status: 'confirmed',
      createdAt: now.toISOString(),
    };
    insertBooking(db, booking);
    return booking;
  });
}

export function toPublic(b: Booking): PublicBooking {
  return { ...b, customer: { name: b.customer.name } };
}

/**
 * Checks and tidies an untrusted request body. Returns the cleaned request, or a message
 * describing the first problem. Mirrors the validators on the booking form.
 */
export function parseBookingRequest(body: unknown): BookingRequest | string {
  if (!body || typeof body !== 'object') return 'Expected a JSON object.';
  const b = body as Record<string, unknown>;
  const c = (b['customer'] ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

  const req: BookingRequest = {
    serviceId: str(b['serviceId']),
    stylistId: str(b['stylistId']),
    date: str(b['date']),
    start: str(b['start']),
    customer: { name: str(c['name']), phone: str(c['phone']), email: str(c['email']), notes: str(c['notes']) },
  };

  if (!findService(req.serviceId)) return 'Unknown service.';
  if (req.stylistId !== 'any' && !findStylist(req.stylistId)) return 'Unknown stylist.';
  if (!isIsoDate(req.date)) return 'Date must be YYYY-MM-DD.';
  if (!/^\d\d:\d\d$/.test(req.start)) return 'Start must be HH:mm.';
  if (!req.customer.name || req.customer.name.length > 80) return 'Please enter your name.';
  if (!/^[+\d][\d\s()-]{7,30}$/.test(req.customer.phone)) return 'Please enter a valid phone number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.customer.email) || req.customer.email.length > 254) {
    return 'Please enter a valid email address.';
  }
  if (req.customer.notes.length > 500) return 'Notes must be 500 characters or fewer.';
  return req;
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Today up to `bookingWindowDays - 1` days ahead, matching the days the booking page shows. */
function withinBookingWindow(date: string, now: Date): boolean {
  const last = new Date(now.getFullYear(), now.getMonth(), now.getDate() + SALON.bookingWindowDays - 1);
  return date >= toIsoDate(now) && date <= toIsoDate(last);
}

/** Short, easy-to-read-over-the-phone reference such as "MP-7K3QXD". */
function newReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'MP-' + Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
}

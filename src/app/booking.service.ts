import { Injectable, computed, signal } from '@angular/core';
import { Booking, Customer, Slot } from './models';
import { SALON, STYLISTS, findService } from './salon.config';
import { availableSlots, fromMinutes, toMinutes } from './time';

const STORAGE_KEY = 'my-phuong.bookings';

export interface BookingRequest {
  serviceId: string;
  /** A stylist id, or 'any' to take whoever is free. */
  stylistId: string;
  date: string;
  start: string;
  customer: Customer;
}

export class SlotTakenError extends Error {
  constructor() {
    super('Sorry, that time has just been taken. Please choose another.');
  }
}

/**
 * Stores bookings in this browser's localStorage. That is enough to try the
 * site out, but bookings made on one device are not visible on another: swap
 * `load`/`persist` for calls to a real backend before going live.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly bookings = signal<Booking[]>(load());

  readonly all = computed(() =>
    [...this.bookings()].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)),
  );

  get(id: string): Booking | undefined {
    return this.bookings().find((b) => b.id === id.toUpperCase());
  }

  slotsFor(serviceId: string, stylistId: string, date: string, now = new Date()): Slot[] {
    const service = findService(serviceId);
    if (!service) return [];
    return availableSlots({
      date,
      durationMin: service.durationMin,
      hours: SALON.hours,
      stylistIds: stylistId === 'any' ? STYLISTS.map((s) => s.id) : [stylistId],
      bookings: this.bookings(),
      stepMin: SALON.slotStepMin,
      notBefore: new Date(now.getTime() + SALON.minNoticeMin * 60_000),
    });
  }

  create(req: BookingRequest): Booking {
    const service = findService(req.serviceId);
    if (!service) throw new Error(`Unknown service ${req.serviceId}`);

    // Re-check right before saving in case the slot went while the form was being filled in.
    const slot = this.slotsFor(req.serviceId, req.stylistId, req.date).find((s) => s.time === req.start);
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
      createdAt: new Date().toISOString(),
    };
    this.update((list) => [...list, booking]);
    return booking;
  }

  cancel(id: string): void {
    this.update((list) => list.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)));
  }

  private update(fn: (list: Booking[]) => Booking[]): void {
    this.bookings.update(fn);
    persist(this.bookings());
  }
}

function load(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

function persist(bookings: Booking[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    // Storage unavailable (private mode, quota): bookings survive only this session.
  }
}

/** Short, easy-to-read-over-the-phone reference such as "MP-7K3QXD". */
function newReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'MP-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

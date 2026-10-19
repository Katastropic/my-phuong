import { HttpClient, HttpErrorResponse, httpResource } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Booking, BookingRequest, PublicBooking, Slot } from './models';

export class SlotTakenError extends Error {
  constructor() {
    super('Sorry, that time has just been taken. Please choose another.');
  }
}

export interface SlotQuery {
  serviceId: string;
  stylistId: string;
  date: string;
}

/**
 * Talks to the booking API in `server/`. In development `ng serve` proxies /api to it
 * (proxy.conf.json); in production nginx does (deploy/nginx/my-phuong.conf).
 *
 * The `…Resource` methods must be called from a component field initializer (injection context);
 * they refetch whenever the signals they read change.
 */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly http = inject(HttpClient);

  slotsResource(query: () => SlotQuery | undefined) {
    return httpResource<Slot[]>(
      () => {
        const q = query();
        return q ? { url: '/api/slots', params: { ...q } } : undefined;
      },
      { defaultValue: [] },
    );
  }

  bookingResource(id: () => string) {
    return httpResource<PublicBooking>(() => `/api/bookings/${encodeURIComponent(id())}`);
  }

  async create(req: BookingRequest): Promise<Booking> {
    try {
      return await firstValueFrom(this.http.post<Booking>('/api/bookings', req));
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409) throw new SlotTakenError();
      throw e;
    }
  }

  cancel(id: string): Promise<PublicBooking> {
    return firstValueFrom(this.http.post<PublicBooking>(`/api/bookings/${encodeURIComponent(id)}/cancel`, {}));
  }

  // --- Staff ---

  async isLoggedIn(): Promise<boolean> {
    const res = await firstValueFrom(this.http.get<{ loggedIn: boolean }>('/api/admin/session'));
    return res.loggedIn;
  }

  /** Resolves to an error message, or null on success. */
  async login(password: string): Promise<string | null> {
    try {
      await firstValueFrom(this.http.post('/api/admin/login', { password }));
      return null;
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 401) return "That password isn't right.";
      if (e instanceof HttpErrorResponse && e.status === 429) return 'Too many attempts. Please wait a minute.';
      throw e;
    }
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.post('/api/admin/logout', {}));
  }

  /** All bookings with contact details. Only fetches while `enabled()` is true. */
  adminBookingsResource(enabled: () => boolean) {
    return httpResource<Booking[]>(() => (enabled() ? '/api/admin/bookings' : undefined), { defaultValue: [] });
  }

  adminCancel(id: string): Promise<Booking> {
    return firstValueFrom(this.http.post<Booking>(`/api/admin/bookings/${encodeURIComponent(id)}/cancel`, {}));
  }
}

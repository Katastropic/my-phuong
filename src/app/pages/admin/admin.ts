import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../booking.service';
import { Booking } from '../../models';
import { LongDatePipe, Time12Pipe } from '../../format.pipes';
import { SALON, STYLISTS, findService, findStylist } from '../../salon.config';
import { toIsoDate } from '../../time';

const UNLOCK_KEY = 'my-phuong.admin';

/** Staff view of upcoming bookings. See `SALON.adminPin` for the (weak) protection. */
@Component({
  selector: 'app-admin',
  imports: [RouterLink, LongDatePipe, Time12Pipe],
  templateUrl: './admin.html',
})
export class Admin {
  private readonly bookings = inject(BookingService);

  protected readonly unlocked = signal(readUnlocked());
  protected readonly pinError = signal(false);
  protected readonly showPast = signal(false);
  protected readonly showStylist = STYLISTS.length > 1;

  protected readonly days = computed(() => {
    const today = toIsoDate(new Date());
    const groups = new Map<string, Booking[]>();
    for (const b of this.bookings.all()) {
      if (!this.showPast() && b.date < today) continue;
      groups.set(b.date, [...(groups.get(b.date) ?? []), b]);
    }
    return [...groups].map(([date, bookings]) => ({ date, bookings, today: date === today }));
  });

  protected unlock(pin: string): void {
    if (pin !== SALON.adminPin) {
      this.pinError.set(true);
      return;
    }
    try {
      sessionStorage.setItem(UNLOCK_KEY, '1');
    } catch {
      // Fine: stays unlocked until the page is reloaded.
    }
    this.unlocked.set(true);
  }

  protected cancel(b: Booking): void {
    if (confirm(`Cancel ${b.customer.name}'s booking?`)) this.bookings.cancel(b.id);
  }

  protected serviceName(id: string): string {
    return findService(id)?.name ?? id;
  }

  protected stylistName(id: string): string {
    return findStylist(id)?.name ?? id;
  }
}

function readUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

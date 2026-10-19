import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../booking.service';
import { Booking } from '../../models';
import { LongDatePipe, Time12Pipe } from '../../format.pipes';
import { STYLISTS, findService, findStylist } from '../../salon.config';
import { toIsoDate } from '../../time';

/** Staff view of upcoming bookings. The password is `ADMIN_PASSWORD` on the server. */
@Component({
  selector: 'app-admin',
  imports: [RouterLink, LongDatePipe, Time12Pipe],
  templateUrl: './admin.html',
})
export class Admin {
  private readonly bookings = inject(BookingService);

  /** null while we ask the server whether the session cookie is still valid. */
  protected readonly loggedIn = signal<boolean | null>(null);
  protected readonly loginError = signal<string | null>(null);
  protected readonly list = this.bookings.adminBookingsResource(() => this.loggedIn() === true);
  protected readonly showPast = signal(false);
  protected readonly showStylist = STYLISTS.length > 1;

  protected readonly days = computed(() => {
    const today = toIsoDate(new Date());
    const groups = new Map<string, Booking[]>();
    for (const b of this.list.hasValue() ? this.list.value() : []) {
      if (!this.showPast() && b.date < today) continue;
      groups.set(b.date, [...(groups.get(b.date) ?? []), b]);
    }
    return [...groups].map(([date, bookings]) => ({ date, bookings, today: date === today }));
  });

  constructor() {
    this.bookings.isLoggedIn().then(
      (yes) => this.loggedIn.set(yes),
      () => this.loggedIn.set(false),
    );
  }

  protected async login(password: string): Promise<void> {
    try {
      const error = await this.bookings.login(password);
      this.loginError.set(error);
      if (!error) this.loggedIn.set(true);
    } catch {
      this.loginError.set("Couldn't reach the server. Please try again.");
    }
  }

  protected async logout(): Promise<void> {
    await this.bookings.logout();
    this.loggedIn.set(false);
  }

  protected async cancel(b: Booking): Promise<void> {
    if (!confirm(`Cancel ${b.customer.name}'s booking?`)) return;
    await this.bookings.adminCancel(b.id);
    this.list.reload();
  }

  protected serviceName(id: string): string {
    return findService(id)?.name ?? id;
  }

  protected stylistName(id: string): string {
    return findStylist(id)?.name ?? id;
  }
}

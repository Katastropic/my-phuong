import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../booking.service';
import { PublicBooking } from '../../models';
import { DurationPipe, LongDatePipe, Time12Pipe } from '../../format.pipes';
import { SALON, STYLISTS, findService, findStylist } from '../../salon.config';

@Component({
  selector: 'app-booking-details',
  imports: [RouterLink, CurrencyPipe, DurationPipe, LongDatePipe, Time12Pipe],
  templateUrl: './booking.html',
})
export class BookingDetails {
  private readonly bookings = inject(BookingService);

  readonly id = input.required<string>();
  /** Set to "1" right after the booking was made. */
  readonly booked = input<string>();

  protected readonly salon = SALON;
  protected readonly showStylist = STYLISTS.length > 1;
  protected readonly booking = this.bookings.bookingResource(this.id);
  protected readonly notFound = computed(() => (this.booking.error() as HttpErrorResponse | undefined)?.status === 404);
  protected readonly service = computed(() =>
    this.booking.hasValue() ? findService(this.booking.value().serviceId) : undefined,
  );
  protected readonly stylist = computed(() =>
    this.booking.hasValue() ? findStylist(this.booking.value().stylistId) : undefined,
  );

  protected async cancel(booking: PublicBooking): Promise<void> {
    if (!confirm('Cancel this appointment?')) return;
    try {
      this.booking.set(await this.bookings.cancel(booking.id));
    } catch {
      alert(`Sorry, we couldn't cancel that just now. Please call us on ${SALON.phone}.`);
    }
  }

  protected downloadCalendar(booking: PublicBooking): void {
    const stamp = (date: string, time: string) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//my-phuong//booking//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@my-phuong`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${stamp(booking.date, booking.start)}`,
      `DTEND:${stamp(booking.date, booking.end)}`,
      `SUMMARY:${this.service()?.name ?? 'Hair appointment'} at ${SALON.name}`,
      `LOCATION:${SALON.address.replaceAll(',', '\\,')}`,
      `DESCRIPTION:Booking reference ${booking.id}. Phone ${SALON.phone}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `${booking.id}.ics` });
    link.click();
    URL.revokeObjectURL(url);
  }
}

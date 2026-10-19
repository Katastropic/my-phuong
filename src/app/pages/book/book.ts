import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingService, SlotTakenError } from '../../booking.service';
import { DurationPipe, LongDatePipe, Time12Pipe } from '../../format.pipes';
import { SALON, STYLISTS, findService, findStylist, servicesByCategory } from '../../salon.config';
import { upcomingDays } from '../../time';

type Step = 1 | 2 | 3;

@Component({
  selector: 'app-book',
  imports: [ReactiveFormsModule, CurrencyPipe, DurationPipe, LongDatePipe, Time12Pipe],
  templateUrl: './book.html',
})
export class Book {
  private readonly bookings = inject(BookingService);
  private readonly router = inject(Router);

  /** `?service=<id>` preselects a service, e.g. from the home page price list. */
  readonly service = input<string>();

  protected readonly categories = servicesByCategory();
  protected readonly stylists = STYLISTS;
  protected readonly stylistOptions = [{ id: 'any', name: 'No preference' }, ...STYLISTS];
  protected readonly days = upcomingDays(SALON.bookingWindowDays, SALON.hours);
  protected readonly steps = ['Service', 'Date & time', 'Your details'];

  protected readonly serviceId = linkedSignal(() => findService(this.service())?.id ?? null);
  protected readonly step = linkedSignal<Step>(() => (findService(this.service()) ? 2 : 1));
  protected readonly stylistId = signal(STYLISTS.length === 1 ? STYLISTS[0].id : 'any');
  protected readonly date = signal<string | null>(null);
  protected readonly time = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly selectedService = computed(() => findService(this.serviceId()));
  protected readonly selectedStylist = computed(() => findStylist(this.stylistId()));
  protected readonly slots = this.bookings.slotsResource(() => {
    const serviceId = this.serviceId();
    const date = this.date();
    return serviceId && date ? { serviceId, stylistId: this.stylistId(), date } : undefined;
  });

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    phone: ['', [Validators.required, Validators.pattern(/^[+\d][\d\s()-]{7,}$/)]],
    email: ['', [Validators.required, Validators.email]],
    notes: ['', Validators.maxLength(500)],
  });

  protected chooseService(id: string): void {
    this.serviceId.set(id);
    this.time.set(null);
    this.step.set(2);
  }

  protected chooseStylist(id: string): void {
    this.stylistId.set(id);
    this.time.set(null);
  }

  protected chooseDate(date: string): void {
    this.date.set(date);
    this.time.set(null);
  }

  protected goTo(step: number): void {
    if (step === 1 || (step === 2 && this.serviceId()) || (step === 3 && this.time())) {
      this.step.set(step as Step);
    }
  }

  protected async submit(): Promise<void> {
    const serviceId = this.serviceId();
    const date = this.date();
    const time = this.time();
    if (this.form.invalid || !serviceId || !date || !time) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      const booking = await this.bookings.create({
        serviceId,
        stylistId: this.stylistId(),
        date,
        start: time,
        customer: this.form.getRawValue(),
      });
      this.router.navigate(['/booking', booking.id], { queryParams: { booked: 1 } });
    } catch (e) {
      if (e instanceof SlotTakenError) {
        this.error.set(e.message);
        this.time.set(null);
        this.step.set(2);
        this.slots.reload();
      } else {
        this.error.set("Sorry, we couldn't save your booking. Please try again, or give us a call.");
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected invalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }
}

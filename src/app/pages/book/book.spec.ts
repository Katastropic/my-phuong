import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BookingService } from '../../booking.service';
import { Book } from './book';

function buttons(root: HTMLElement, text: string | RegExp): HTMLButtonElement[] {
  return [...root.querySelectorAll('button')].filter((b) =>
    typeof text === 'string' ? b.textContent?.includes(text) : text.test(b.textContent ?? ''),
  );
}

function type(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('Book', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [Book], providers: [provideRouter([])] });
  });

  it('books a slot end to end and stops offering it', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Book);
    fixture.componentRef.setInput('service', 'mens-cut');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    // Step 2: last open day (never today, so it always has free times), then its first time.
    const day = [...el.querySelectorAll<HTMLButtonElement>('button[aria-label]')].filter((b) => !b.disabled).at(-1)!;
    day.click();
    await fixture.whenStable();
    const firstSlot = buttons(el, /\d:\d\d [ap]m/)[0];
    const time = firstSlot.textContent!.trim();
    firstSlot.click();
    await fixture.whenStable();
    buttons(el, 'Continue')[0].click();
    await fixture.whenStable();

    // Step 3: empty form is rejected, filled form books.
    buttons(el, 'Confirm booking')[0].click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Please enter your name.');

    type(el, '#name', 'Jane Citizen');
    type(el, '#phone', '0412 345 678');
    type(el, '#email', 'jane@example.com');
    buttons(el, 'Confirm booking')[0].click();
    await fixture.whenStable();

    const [booking] = TestBed.inject(BookingService).all();
    expect(booking.customer.name).toBe('Jane Citizen');
    expect(booking.serviceId).toBe('mens-cut');
    expect(navigate).toHaveBeenCalledWith(['/booking', booking.id], { queryParams: { booked: 1 } });
    expect(JSON.parse(localStorage.getItem('my-phuong.bookings')!)).toHaveLength(1);

    const remaining = TestBed.inject(BookingService)
      .slotsFor('mens-cut', booking.stylistId, booking.date)
      .map((s) => s.time);
    expect(remaining).not.toContain(booking.start);
    expect(time).toMatch(/am|pm/);
  });
});

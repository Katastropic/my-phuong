import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Booking, BookingRequest } from '../../models';
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
  let http: HttpTestingController;
  let fixture: ComponentFixture<Book>;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Book],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Book);
    fixture.componentRef.setInput('service', 'mens-cut');
    await fixture.whenStable();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => http.verify());

  /** Picks the last open day, answers the slot request, picks 10:00 and fills in the form. */
  async function reachDetailsStep(): Promise<string> {
    const day = [...el.querySelectorAll<HTMLButtonElement>('button[aria-label]')].filter((b) => !b.disabled).at(-1)!;
    day.click();
    TestBed.tick();
    const slotsReq = http.expectOne((r) => r.url === '/api/slots');
    const date = slotsReq.request.params.get('date')!;
    expect(slotsReq.request.params.get('serviceId')).toBe('mens-cut');
    slotsReq.flush([
      { time: '09:30', stylistIds: ['phuong'] },
      { time: '10:00', stylistIds: ['phuong'] },
    ]);
    await fixture.whenStable();

    buttons(el, '10:00 am')[0].click();
    await fixture.whenStable();
    buttons(el, 'Continue')[0].click();
    await fixture.whenStable();

    type(el, '#name', 'Jane Citizen');
    type(el, '#phone', '0412 345 678');
    type(el, '#email', 'jane@example.com');
    return date;
  }

  it('rejects an empty form, then posts the booking and opens its page', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const date = await reachDetailsStep();

    type(el, '#name', '');
    buttons(el, 'Confirm booking')[0].click();
    await fixture.whenStable();
    expect(el.textContent).toContain('Please enter your name.');
    http.expectNone('/api/bookings');

    type(el, '#name', 'Jane Citizen');
    buttons(el, 'Confirm booking')[0].click();
    const req = http.expectOne({ method: 'POST', url: '/api/bookings' });
    expect(req.request.body as BookingRequest).toEqual({
      serviceId: 'mens-cut',
      stylistId: 'phuong',
      date,
      start: '10:00',
      customer: { name: 'Jane Citizen', phone: '0412 345 678', email: 'jane@example.com', notes: '' },
    });
    req.flush({ ...req.request.body, id: 'MP-ABC234', end: '10:30', status: 'confirmed' } as Booking, {
      status: 201,
      statusText: 'Created',
    });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith(['/booking', 'MP-ABC234'], { queryParams: { booked: 1 } });
  });

  it('goes back to the times, refreshed, when the slot was just taken', async () => {
    await reachDetailsStep();

    buttons(el, 'Confirm booking')[0].click();
    http
      .expectOne({ method: 'POST', url: '/api/bookings' })
      .flush({ error: 'taken' }, { status: 409, statusText: 'Conflict' });
    // Can't use whenStable yet: it would wait for the slot reload this test hasn't answered.
    await new Promise((resolve) => setTimeout(resolve));
    TestBed.tick();
    http.expectOne((r) => r.url === '/api/slots').flush([{ time: '09:30', stylistIds: ['phuong'] }]);
    await fixture.whenStable();

    expect(el.textContent).toContain('that time has just been taken');
    expect(el.textContent).toContain('Pick a day');
    expect(buttons(el, '10:00 am')).toHaveLength(0);
  });
});

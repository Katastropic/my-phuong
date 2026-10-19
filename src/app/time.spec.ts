import { Booking, OpeningHours } from './models';
import { availableSlots, formatTime, upcomingDays } from './time';

// 2026-10-20 is a Tuesday.
const HOURS: OpeningHours = { 0: null, 1: null, 2: { open: '09:00', close: '12:00' }, 3: null, 4: null, 5: null, 6: null };

function booking(stylistId: string, start: string, end: string, status: Booking['status'] = 'confirmed'): Booking {
  return {
    id: `MP-${start}`,
    serviceId: 'x',
    stylistId,
    date: '2026-10-20',
    start,
    end,
    status,
    createdAt: '',
    customer: { name: '', phone: '', email: '', notes: '' },
  };
}

function times(bookings: Booking[], durationMin = 60, stylistIds = ['a'], notBefore?: Date) {
  return availableSlots({ date: '2026-10-20', durationMin, hours: HOURS, stylistIds, bookings, stepMin: 30, notBefore }).map(
    (s) => s.time,
  );
}

describe('availableSlots', () => {
  it('offers every start time that fits before closing', () => {
    expect(times([])).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
  });

  it('returns nothing on a closed day', () => {
    expect(availableSlots({ date: '2026-10-19', durationMin: 30, hours: HOURS, stylistIds: ['a'], bookings: [], stepMin: 30 })).toEqual([]);
  });

  it('skips times that overlap an existing booking', () => {
    expect(times([booking('a', '10:00', '10:30')])).toEqual(['09:00', '10:30', '11:00']);
  });

  it('ignores cancelled bookings', () => {
    expect(times([booking('a', '10:00', '10:30', 'cancelled')])).toHaveLength(5);
  });

  it('keeps a time open while any stylist is free', () => {
    const slots = availableSlots({
      date: '2026-10-20',
      durationMin: 60,
      hours: HOURS,
      stylistIds: ['a', 'b'],
      bookings: [booking('a', '09:00', '12:00')],
      stepMin: 30,
    });
    expect(slots.map((s) => s.time)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
    expect(slots.every((s) => s.stylistIds.join() === 'b')).toBe(true);
  });

  it('respects the minimum-notice cutoff', () => {
    expect(times([], 60, ['a'], new Date(2026, 9, 20, 10, 15))).toEqual(['10:30', '11:00']);
    expect(times([], 60, ['a'], new Date(2026, 9, 21, 8, 0))).toEqual([]);
  });
});

describe('formatTime', () => {
  it('formats 12-hour times', () => {
    expect(formatTime('09:05')).toBe('9:05 am');
    expect(formatTime('12:00')).toBe('12:00 pm');
    expect(formatTime('17:30')).toBe('5:30 pm');
  });
});

describe('upcomingDays', () => {
  it('marks closed days', () => {
    const days = upcomingDays(3, HOURS, new Date(2026, 9, 19));
    expect(days.map((d) => [d.date, d.closed])).toEqual([
      ['2026-10-19', true],
      ['2026-10-20', false],
      ['2026-10-21', true],
    ]);
  });
});

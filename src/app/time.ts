import { Booking, OpeningHours, Slot } from './models';

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" for a Date in local time. */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "9:30 am" style label for an "HH:mm" time. */
export function formatTime(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export interface CalendarDay {
  date: string;
  weekday: string;
  day: number;
  month: string;
  closed: boolean;
}

export function upcomingDays(count: number, hours: OpeningHours, from = new Date()): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    days.push({
      date: toIsoDate(d),
      weekday: d.toLocaleDateString('en-AU', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-AU', { month: 'short' }),
      closed: !hours[d.getDay()],
    });
  }
  return days;
}

export interface SlotQuery {
  date: string;
  durationMin: number;
  hours: OpeningHours;
  stylistIds: string[];
  bookings: Booking[];
  stepMin: number;
  /** No slot may start before this moment (e.g. now + minimum notice). */
  notBefore?: Date;
}

/** Start times on `date` where at least one of `stylistIds` is free for the full appointment. */
export function availableSlots(q: SlotQuery): Slot[] {
  const day = q.hours[parseIsoDate(q.date).getDay()];
  if (!day) return [];

  let earliest = toMinutes(day.open);
  if (q.notBefore) {
    const cutoffDate = toIsoDate(q.notBefore);
    if (q.date < cutoffDate) return [];
    if (q.date === cutoffDate) {
      earliest = Math.max(earliest, q.notBefore.getHours() * 60 + q.notBefore.getMinutes());
    }
  }

  const sameDay = q.bookings.filter((b) => b.status === 'confirmed' && b.date === q.date);
  const slots: Slot[] = [];
  for (let start = toMinutes(day.open); start + q.durationMin <= toMinutes(day.close); start += q.stepMin) {
    if (start < earliest) continue;
    const end = start + q.durationMin;
    const free = q.stylistIds.filter(
      (id) =>
        !sameDay.some(
          (b) => b.stylistId === id && toMinutes(b.start) < end && start < toMinutes(b.end),
        ),
    );
    if (free.length) slots.push({ time: fromMinutes(start), stylistIds: free });
  }
  return slots;
}

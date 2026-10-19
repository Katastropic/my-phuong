export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  durationMin: number;
  /** Starting price in AUD. */
  priceFrom: number;
}

export interface Stylist {
  id: string;
  name: string;
}

/** Times are 24h "HH:mm" strings. `null` means closed. */
export interface DayHours {
  open: string;
  close: string;
}

/** Keyed by weekday: 0 = Sunday … 6 = Saturday. */
export type OpeningHours = Record<number, DayHours | null>;

export interface Customer {
  name: string;
  phone: string;
  email: string;
  notes: string;
}

export type BookingStatus = 'confirmed' | 'cancelled';

export interface Booking {
  id: string;
  serviceId: string;
  stylistId: string;
  /** Local date, "YYYY-MM-DD". */
  date: string;
  /** Local time, "HH:mm". */
  start: string;
  end: string;
  customer: Customer;
  status: BookingStatus;
  createdAt: string;
}

export interface Slot {
  time: string;
  /** Stylists free for the whole appointment starting at this time. */
  stylistIds: string[];
}

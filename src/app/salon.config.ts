import { OpeningHours, Service, Stylist } from './models';

/**
 * Everything about the salon lives here. Edit this file to change the name,
 * contact details, opening hours, services and prices shown on the site.
 */
export const SALON = {
  name: 'Phuong Hair Studio',
  tagline: 'My mother\'s hair studio, in the north suburbs of Adelaide.',
  phone: '0433 550 941',
  email: 'hello@phuonghair.example',
  address: '22 First Avenue, Woodville Gardens SA 5012',
  mapUrl: 'https://maps.app.goo.gl/uyMNkjxGyTzx2Smt5',

  /** 0 = Sunday … 6 = Saturday. */
  hours: {
    0: null,
    1: { open: '09:00', close: '17:30' },
    2: { open: '09:00', close: '17:30' },
    3: { open: '09:00', close: '17:30' },
    4: { open: '09:00', close: '19:00' },
    5: { open: '09:00', close: '17:30' },
    6: { open: '09:00', close: '15:00' },
  } as OpeningHours,

  /** How far ahead customers can book. */
  bookingWindowDays: 28,
  /** Minimum notice for a same-day booking. */
  minNoticeMin: 60,
  /** Gap between offered start times. */
  slotStepMin: 30,

  /** Opening hours and booking times are in this time zone; the server runs on it. */
  timeZone: 'Australia/Adelaide',
};

/** Add more stylists here; the booking page shows a stylist picker when there is more than one. */
export const STYLISTS: Stylist[] = [{ id: 'phuong', name: 'Phuong' }];

export const SERVICES: Service[] = [
  {
    id: 'womens-cut',
    name: "Women's cut & blow-dry",
    category: 'Cuts',
    description: 'Consultation, wash, precision cut and blow-dry finish.',
    durationMin: 60,
    priceFrom: 65,
  },
  {
    id: 'mens-cut',
    name: "Men's cut",
    category: 'Cuts',
    description: 'Clipper or scissor cut, finished and styled.',
    durationMin: 30,
    priceFrom: 35,
  },
  {
    id: 'kids-cut',
    name: 'Kids cut (under 12)',
    category: 'Cuts',
    description: 'A quick, fuss-free trim for little ones.',
    durationMin: 30,
    priceFrom: 25,
  },
  {
    id: 'root-touch-up',
    name: 'Root touch-up',
    category: 'Colour',
    description: 'Regrowth colour to keep your shade fresh.',
    durationMin: 90,
    priceFrom: 85,
  },
  {
    id: 'full-colour',
    name: 'Full colour',
    category: 'Colour',
    description: 'All-over colour from roots to ends, with blow-dry.',
    durationMin: 120,
    priceFrom: 120,
  },
  {
    id: 'foils',
    name: 'Half head foils',
    category: 'Colour',
    description: 'Highlights or lowlights through the top and sides.',
    durationMin: 120,
    priceFrom: 140,
  },
  {
    id: 'balayage',
    name: 'Balayage',
    category: 'Colour',
    description: 'Hand-painted, soft and natural-looking lightening.',
    durationMin: 180,
    priceFrom: 220,
  },
  {
    id: 'blow-dry',
    name: 'Wash & blow-dry',
    category: 'Styling & treatments',
    description: 'Smooth, bouncy or sleek — styled the way you like it.',
    durationMin: 30,
    priceFrom: 45,
  },
  {
    id: 'treatment',
    name: 'Nourishing treatment',
    category: 'Styling & treatments',
    description: 'Deep-conditioning mask to restore shine and softness.',
    durationMin: 30,
    priceFrom: 35,
  },
  {
    id: 'perm',
    name: 'Perm',
    category: 'Styling & treatments',
    description: 'Long-lasting curl or wave, tailored to your hair.',
    durationMin: 150,
    priceFrom: 150,
  },
];

export function findService(id: string | null | undefined): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function findStylist(id: string | null | undefined): Stylist | undefined {
  return STYLISTS.find((s) => s.id === id);
}

export function servicesByCategory(): { category: string; services: Service[] }[] {
  const groups = new Map<string, Service[]>();
  for (const service of SERVICES) {
    groups.set(service.category, [...(groups.get(service.category) ?? []), service]);
  }
  return [...groups].map(([category, services]) => ({ category, services }));
}

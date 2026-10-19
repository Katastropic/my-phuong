# my-phuong
Hairdressing booking website for my mother ;)

Built with Angular 22 and Tailwind CSS 4.

## Running it

```bash
npm install
npm start          # http://localhost:4200
npm test           # unit tests (Vitest)
npm run build      # production build in dist/my-phuong
```

## Pages

| URL | What it does |
| --- | --- |
| `/` | Home page: intro, services & prices, contact details, opening hours |
| `/book` | 3-step booking: service → day & time → contact details. `/book?service=<id>` skips to step 2 |
| `/booking/<ref>` | Booking confirmation: add to calendar or cancel |
| `/admin` | Staff list of bookings, with cancel (PIN in `salon.config.ts`, default `1234`) |

## Customising

Almost everything lives in [`src/app/salon.config.ts`](src/app/salon.config.ts):
salon name, phone, address, opening hours, booking window, minimum notice,
stylists and the services/prices list. Colours and fonts are in
[`src/styles.css`](src/styles.css) (`@theme` block).

## Before going live

Bookings are currently saved in the visitor's browser (`localStorage`), so the
salon **can't see bookings made on customers' phones yet**. To take real
bookings, replace `load`/`persist` in
[`src/app/booking.service.ts`](src/app/booking.service.ts) with calls to a
backend (e.g. Firebase, Supabase or a small API) and swap the admin PIN for
real login. Email/SMS confirmations would also be done from that backend.

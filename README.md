# my-phuong
Hairdressing booking website for my mother ;)

Built with Angular 22 and Tailwind CSS 4, with a small Node API (Hono + SQLite) in `server/`.

## Running it

```bash
npm install
cp .env.example .env   # once: set the staff password
npm run server         # API on :3000
npm start              # site on http://localhost:4200 (forwards /api to the API)
npm test               # frontend unit tests (Vitest)
npm run test:server    # API tests
npm run build          # production build in dist/my-phuong
npm run build:server   # API bundled into dist/server/main.mjs
```

Running it behind nginx, locally or on a server: see [`deploy/README.md`](deploy/README.md).

## Pages

| URL | What it does |
| --- | --- |
| `/` | Home page: intro, services & prices, contact details, opening hours |
| `/book` | 3-step booking: service → day & time → contact details. `/book?service=<id>` skips to step 2 |
| `/booking/<ref>` | Booking confirmation: add to calendar or cancel |
| `/admin` | Staff list of bookings, with cancel (password is `ADMIN_PASSWORD` in `.env`) |

## Customising

Almost everything lives in [`src/app/salon.config.ts`](src/app/salon.config.ts):
salon name, phone, address, opening hours, booking window, minimum notice,
stylists and the services/prices list. Colours and fonts are in
[`src/styles.css`](src/styles.css) (`@theme` block).

## Before going live

- Set a strong `ADMIN_PASSWORD` and a random `SESSION_SECRET` on the server.
- Set up nightly backups of the SQLite database (see `deploy/README.md`).
- Email/SMS confirmations aren't built yet; they'd go in the API.

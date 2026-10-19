import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { serve } from '@hono/node-server';
import { SALON } from '../src/app/salon.config';
import { createApp } from './app';
import { openDb } from './db';

// Slot maths uses the process's local time, so run in the salon's time zone whatever the server's is.
process.env['TZ'] = SALON.timeZone;

const production = process.env['NODE_ENV'] === 'production';
const port = Number(process.env['PORT'] ?? 3000);
const dbPath = process.env['DATABASE_PATH'] ?? 'data/bookings.db';

mkdirSync(dirname(dbPath), { recursive: true });

const app = createApp({
  db: openDb(dbPath),
  adminPassword: required('ADMIN_PASSWORD'),
  sessionSecret: required('SESSION_SECRET'),
  secureCookies: production && process.env['INSECURE_COOKIES'] !== '1',
});

// 127.0.0.1, not 0.0.0.0: only programs on this machine (nginx) can reach the API directly.
serve({ fetch: app.fetch, hostname: '127.0.0.1', port }, (info) => {
  console.log(`API listening on http://127.0.0.1:${info.port} (database: ${dbPath})`);
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
  return value;
}

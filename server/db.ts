import { DatabaseSync } from 'node:sqlite';
import { Booking, BookingStatus } from '../src/app/models';

export type Db = DatabaseSync;

/** Opens (or creates) the SQLite file and makes sure the table exists. Pass ':memory:' for tests. */
export function openDb(path: string): Db {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS bookings (
      id             TEXT PRIMARY KEY,
      service_id     TEXT NOT NULL,
      stylist_id     TEXT NOT NULL,
      date           TEXT NOT NULL,
      start          TEXT NOT NULL,
      end            TEXT NOT NULL,
      customer_name  TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_notes TEXT NOT NULL,
      status         TEXT NOT NULL,
      created_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS bookings_by_date ON bookings (date, start);
  `);
  return db;
}

/**
 * Runs `fn` inside a write transaction. BEGIN IMMEDIATE takes the write lock up front, so the
 * "is this slot free?" check and the insert can't be interleaved with another booking.
 */
export function transaction<T>(db: Db, fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function bookingsOn(db: Db, date: string): Booking[] {
  return db.prepare('SELECT * FROM bookings WHERE date = ? ORDER BY start').all(date).map(toBooking);
}

export function allBookings(db: Db): Booking[] {
  return db.prepare('SELECT * FROM bookings ORDER BY date, start').all().map(toBooking);
}

export function findBooking(db: Db, id: string): Booking | undefined {
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  return row ? toBooking(row) : undefined;
}

export function insertBooking(db: Db, b: Booking): void {
  db.prepare(
    `INSERT INTO bookings (id, service_id, stylist_id, date, start, end,
       customer_name, customer_phone, customer_email, customer_notes, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    b.id,
    b.serviceId,
    b.stylistId,
    b.date,
    b.start,
    b.end,
    b.customer.name,
    b.customer.phone,
    b.customer.email,
    b.customer.notes,
    b.status,
    b.createdAt,
  );
}

export function setStatus(db: Db, id: string, status: BookingStatus): Booking | undefined {
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  return findBooking(db, id);
}

function toBooking(row: Record<string, unknown>): Booking {
  const r = row as Record<string, string>;
  return {
    id: r['id'],
    serviceId: r['service_id'],
    stylistId: r['stylist_id'],
    date: r['date'],
    start: r['start'],
    end: r['end'],
    customer: {
      name: r['customer_name'],
      phone: r['customer_phone'],
      email: r['customer_email'],
      notes: r['customer_notes'],
    },
    status: r['status'] as BookingStatus,
    createdAt: r['created_at'],
  };
}

import { createHash, timingSafeEqual } from 'node:crypto';
import type { Context } from 'hono';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';

const COOKIE = 'admin_session';
const SESSION_HOURS = 12;

export interface AuthOptions {
  adminPassword: string;
  /** Long random string used to sign the session cookie so it can't be forged. */
  sessionSecret: string;
  /** Send the cookie over HTTPS only. On in production; off for plain-http local testing. */
  secureCookies: boolean;
}

export function passwordMatches(given: unknown, expected: string): boolean {
  if (typeof given !== 'string') return false;
  // Compare hashes in constant time so response timing doesn't leak how much of the password was right.
  const hash = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(hash(given), hash(expected));
}

/** The cookie holds only the expiry time; the signature proves the server issued it. */
export async function startSession(c: Context, opts: AuthOptions, now: Date): Promise<void> {
  const expires = now.getTime() + SESSION_HOURS * 3_600_000;
  await setSignedCookie(c, COOKIE, String(expires), opts.sessionSecret, {
    path: '/api',
    httpOnly: true,
    secure: opts.secureCookies,
    sameSite: 'Strict',
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function hasSession(c: Context, opts: AuthOptions, now: Date): Promise<boolean> {
  const value = await getSignedCookie(c, opts.sessionSecret, COOKIE);
  return !!value && Number(value) > now.getTime();
}

export function endSession(c: Context): void {
  deleteCookie(c, COOKIE, { path: '/api' });
}

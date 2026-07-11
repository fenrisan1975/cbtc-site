// Shared helpers for the password-protected /admin area.
//
// Auth model (v1): a single shared password (the ADMIN_PASSWORD env var)
// rather than per-user accounts -- there's only one admin (Andrew) for now.
// On successful login we set a cookie containing an HMAC derived from the
// password, not the password itself, so the raw password never sits in a
// cookie or gets logged. See SETUP.md for how to set ADMIN_PASSWORD.
import crypto from 'node:crypto';

export const ADMIN_COOKIE = 'cbtc_admin_session';

function sessionToken() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update('cbtc-admin-session').digest('hex');
}

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkPassword(password) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret || !password) return false;
  return timingSafeStringEqual(password, secret);
}

export function isAuthed(cookies) {
  const token = sessionToken();
  if (!token) return false; // ADMIN_PASSWORD not configured -- fail closed
  const cookie = cookies.get(ADMIN_COOKIE)?.value;
  if (!cookie) return false;
  return timingSafeStringEqual(cookie, token);
}

export function setAuthCookie(cookies) {
  const token = sessionToken();
  cookies.set(ADMIN_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearAuthCookie(cookies) {
  cookies.delete(ADMIN_COOKIE, { path: '/' });
}

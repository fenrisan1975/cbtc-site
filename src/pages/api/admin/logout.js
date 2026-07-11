// POST /api/admin/logout -- clears the admin session cookie.
import { clearAuthCookie } from '../../../lib/adminAuth.js';

export const prerender = false;

export async function POST({ cookies, redirect }) {
  clearAuthCookie(cookies);
  return redirect('/admin/login', 303);
}

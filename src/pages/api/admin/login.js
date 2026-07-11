// POST /api/admin/login
// Form-encoded body: { password }
// Checks against ADMIN_PASSWORD (Netlify env var) and sets the admin
// session cookie on success. See src/lib/adminAuth.js.
import { checkPassword, setAuthCookie } from '../../../lib/adminAuth.js';

export const prerender = false;

export async function POST({ request, cookies, redirect }) {
  const form = await request.formData();
  const password = (form.get('password') || '').toString();

  if (!checkPassword(password)) {
    return redirect('/admin/login?error=1', 303);
  }

  setAuthCookie(cookies);
  return redirect('/admin', 303);
}

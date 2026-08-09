// POST /api/admin/update-details
// Form-encoded body: { id, description, address, website, status? }
// (status is just the admin tab to redirect back to, e.g. 'pending' or
// 'all'.)
// Fixes signup mistakes -- lets Andrew correct a business's description,
// address, or website after submission. If the address text changes, the
// map pin is re-geocoded automatically (see updateBusinessDetails in
// businesses.js).
// Protected by the admin session cookie -- see src/middleware.js.
import { updateBusinessDetails } from '../../../lib/businesses.js';

export const prerender = false;

export async function POST({ request, redirect }) {
  const form = await request.formData();
  const id = Number(form.get('id'));
  const returnTab = (form.get('status') || 'pending').toString();
  const description = (form.get('description') || '').toString().trim();
  const address = (form.get('address') || '').toString().trim();
  const website = (form.get('website') || '').toString().trim().slice(0, 300);

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  await updateBusinessDetails(id, { description, address, website });

  return redirect(`/admin?status=${returnTab}`, 303);
}

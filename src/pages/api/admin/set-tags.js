// POST /api/admin/set-tags
// Form-encoded body: { id, status?, tags[] }  (status is just the admin tab
// to redirect back to, same pattern as approve.js/reject.js; tags is the
// full replacement set of tag IDs for this business -- unchecked boxes
// simply aren't present in the form data).
// Protected by the admin session cookie -- see src/middleware.js.
import { setBusinessTags } from '../../../lib/businesses.js';

export const prerender = false;

export async function POST({ request, redirect }) {
  const form = await request.formData();
  const id = Number(form.get('id'));
  const returnTab = (form.get('status') || 'pending').toString();

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const tagIds = form.getAll('tags').map(Number);
  await setBusinessTags(id, tagIds);

  return redirect(`/admin?status=${returnTab}`, 303);
}

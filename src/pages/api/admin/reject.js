// POST /api/admin/reject
// Form-encoded body: { id, status? } (status is just the admin tab to
// redirect back to -- not the new business status).
// Protected by the admin session cookie -- see src/middleware.js.
import { getDb } from '../../../lib/db.js';

export const prerender = false;

export async function POST({ request, redirect }) {
  const form = await request.formData();
  const id = Number(form.get('id'));
  const returnTab = (form.get('status') || 'pending').toString();

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
  }

  const sql = getDb();
  await sql`UPDATE businesses SET status = 'rejected', approved_at = NULL WHERE id = ${id}`;

  return redirect(`/admin?status=${returnTab}`, 303);
}

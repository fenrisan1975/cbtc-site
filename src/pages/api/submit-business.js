// POST /api/submit-business
// Public endpoint -- anyone can submit a business, but it's saved with
// status='pending' and won't show on the public directory until you approve
// it (see SETUP.md for the approval step).
import { getDb } from '../../lib/db.js';
import { slugify } from '../../lib/slugify.js';

export const prerender = false;

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim();

  if (!name || !email) {
    return new Response(
      JSON.stringify({ error: 'Business name and contact email are required.' }),
      { status: 400 }
    );
  }

  const description = (body.description || '').trim().slice(0, 2000);
  const address = (body.address || '').trim().slice(0, 300);
  const phone = (body.phone || '').trim().slice(0, 50);
  const website = (body.website || '').trim().slice(0, 300);
  const hours = (body.hours || '').trim().slice(0, 500);
  const categoryId = body.categoryId ? Number(body.categoryId) : null;

  const sql = getDb();

  // Make sure the slug is unique by appending a short suffix if needed.
  const baseSlug = slugify(name) || 'business';
  let slug = baseSlug;
  let suffix = 1;
  // Cap attempts so a pathological input can't loop forever.
  while (suffix < 50) {
    const existing = await sql`SELECT id FROM businesses WHERE slug = ${slug} LIMIT 1`;
    if (existing.length === 0) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  await sql`
    INSERT INTO businesses
      (name, slug, category_id, description, address, phone, email, website, hours, status)
    VALUES
      (${name}, ${slug}, ${categoryId}, ${description}, ${address}, ${phone}, ${email}, ${website}, ${hours}, 'pending')
  `;

  return new Response(JSON.stringify({ ok: true, slug }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

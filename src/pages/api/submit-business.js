// POST /api/submit-business
// Public endpoint -- anyone can submit a business, but it's saved with
// status='pending' and won't show on the public directory until you approve
// it (see SETUP.md for the approval step).
import { getDb } from '../../lib/db.js';
import { slugify } from '../../lib/slugify.js';
import { isSafeUrl } from '../../lib/url.js';
import { setBusinessTags } from '../../lib/businesses.js';
import { notifyNewBusiness } from '../../lib/notify.js';

export const prerender = false;

// A fake "success" response for spam we silently drop -- returning ok:true
// (instead of an error) means a bot doesn't learn it was blocked and try a
// different approach. Nothing gets written to the database in this case.
function fakeSuccessResponse() {
  return new Response(JSON.stringify({ ok: true, slug: 'thanks' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  // --- spam checks -------------------------------------------------
  // Honeypot: submit.astro renders a field that's hidden from real
  // visitors (off-screen + aria-hidden). Bots that blindly fill in every
  // field on a form will trip it.
  const honeypot = (body.hp_url || '').trim();
  if (honeypot) return fakeSuccessResponse();

  // Timing trap: submit.astro embeds the server-render timestamp in a
  // hidden field. A real visitor takes at least a few seconds to fill out
  // the form; anything submitted near-instantly is almost certainly a
  // script, not a person.
  const renderedAt = Number(body.ts);
  if (renderedAt && Date.now() - renderedAt < 3000) return fakeSuccessResponse();
  // -------------------------------------------------------------------

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
  // Cap at 5 -- the form suggests up to 3, but don't hard-fail a legit
  // submission that checked a few extra boxes.
  const tagIds = Array.isArray(body.tags)
    ? body.tags.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 5)
    : [];

  if (website && !isSafeUrl(website)) {
    return new Response(
      JSON.stringify({ error: 'Website must start with http:// or https://' }),
      { status: 400 }
    );
  }

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

  const inserted = await sql`
    INSERT INTO businesses
      (name, slug, category_id, description, address, phone, email, website, hours, status)
    VALUES
      (${name}, ${slug}, ${categoryId}, ${description}, ${address}, ${phone}, ${email}, ${website}, ${hours}, 'pending')
    RETURNING id
  `;

  if (tagIds.length > 0) {
    await setBusinessTags(inserted[0].id, tagIds);
  }

  // Notify (James, Amelia, Andrew) that a new listing came in. Never lets a
  // notification problem fail the submission -- see notify.js.
  await notifyNewBusiness({ name, description, address, phone, email, website });

  return new Response(JSON.stringify({ ok: true, slug }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

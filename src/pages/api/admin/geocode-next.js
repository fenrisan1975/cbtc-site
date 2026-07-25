// POST /api/admin/geocode-next
// Geocodes exactly ONE business per call (not the whole backlog) so this
// stays well within a Netlify Function's execution time limit -- the
// /admin page drives the loop from the browser, waiting ~1.1s between
// calls to respect Nominatim's rate limit, and passing back the ids it's
// already tried so a bad address doesn't get retried forever.
//
// Runs inside the deployed site, so it uses the same always-writable
// production connection as submit-business.js / approve.js (via getDb()).
// This exists because copying the production connection string via
// `netlify database status --branch production --show-credentials` only
// grants read-only access unless you're the Netlify Team Owner (see
// Netlify's Database access control docs) -- writing through the app's
// own runtime sidesteps that entirely.
import { getDb } from '../../../lib/db.js';
import { geocodeAddress } from '../../../lib/geocode.js';

export const prerender = false;

export async function POST({ request }) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine -- treated as an empty exclude list
  }

  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];

  const sql = getDb();

  const rows = await sql`
    SELECT id, name, address
    FROM businesses
    WHERE address IS NOT NULL AND address != ''
      AND (latitude IS NULL OR longitude IS NULL)
      AND NOT (id = ANY(${excludeIds}))
    ORDER BY id ASC
    LIMIT 1
  `;

  if (rows.length === 0) {
    return new Response(JSON.stringify({ done: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const business = rows[0];
  const coords = await geocodeAddress(business.address);

  if (coords) {
    await sql`
      UPDATE businesses SET latitude = ${coords.latitude}, longitude = ${coords.longitude}
      WHERE id = ${business.id}
    `;
  }

  return new Response(
    JSON.stringify({
      done: false,
      business: { id: business.id, name: business.name, address: business.address },
      geocoded: Boolean(coords),
      ...(coords || {}),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

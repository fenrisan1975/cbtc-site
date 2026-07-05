// POST /api/toggle-favorite
// Body: { businessId: number, clientToken: string, action: 'add' | 'remove' }
// clientToken is a random ID the browser generates once and stores in
// localStorage -- lets us count one favorite per visitor without any login.
import { getDb } from '../../lib/db.js';

export const prerender = false;

export async function POST({ request }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const businessId = Number(body.businessId);
  const clientToken = (body.clientToken || '').trim();
  const action = body.action === 'remove' ? 'remove' : 'add';

  if (!businessId || !clientToken) {
    return new Response(
      JSON.stringify({ error: 'businessId and clientToken are required.' }),
      { status: 400 }
    );
  }

  const sql = getDb();

  if (action === 'add') {
    const inserted = await sql`
      INSERT INTO favorites (business_id, client_token)
      VALUES (${businessId}, ${clientToken})
      ON CONFLICT (business_id, client_token) DO NOTHING
      RETURNING id
    `;
    if (inserted.length > 0) {
      await sql`UPDATE businesses SET favorite_count = favorite_count + 1 WHERE id = ${businessId}`;
    }
  } else {
    const deleted = await sql`
      DELETE FROM favorites WHERE business_id = ${businessId} AND client_token = ${clientToken}
      RETURNING id
    `;
    if (deleted.length > 0) {
      await sql`UPDATE businesses SET favorite_count = GREATEST(favorite_count - 1, 0) WHERE id = ${businessId}`;
    }
  }

  const [row] = await sql`SELECT favorite_count FROM businesses WHERE id = ${businessId}`;

  return new Response(JSON.stringify({ ok: true, favoriteCount: row ? row.favorite_count : 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

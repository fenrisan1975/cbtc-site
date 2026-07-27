import { getDb } from './db.js';
import { geocodeAddress } from './geocode.js';

export async function getCategories() {
  const sql = getDb();
  return sql`SELECT id, name, slug FROM categories ORDER BY sort_order ASC, name ASC`;
}

export async function getTags() {
  const sql = getDb();
  return sql`SELECT id, name, slug FROM tags ORDER BY sort_order ASC, name ASC`;
}

// Given a list of business rows, fetch all their tags in one query and
// attach a `tags: [{id, name, slug}]` array to each. Done as a separate
// query (rather than a JOIN + json_agg in the main query) to keep the main
// business queries below simple three-shape tagged templates -- see the
// comment on getApprovedBusinesses for why that pattern was chosen.
async function attachTags(businesses) {
  if (businesses.length === 0) return businesses;
  const sql = getDb();
  const ids = businesses.map((b) => b.id);
  const tagRows = await sql`
    SELECT bt.business_id, t.id, t.name, t.slug
    FROM business_tags bt
    JOIN tags t ON t.id = bt.tag_id
    WHERE bt.business_id = ANY(${ids})
    ORDER BY t.name ASC
  `;
  const byBusiness = new Map();
  for (const row of tagRows) {
    const list = byBusiness.get(row.business_id) || [];
    list.push({ id: row.id, name: row.name, slug: row.slug });
    byBusiness.set(row.business_id, list);
  }
  return businesses.map((b) => ({ ...b, tags: byBusiness.get(b.id) || [] }));
}

// filters: { categorySlug?: string, q?: string, tagSlug?: string }
// Tag filtering happens in JS after fetching (not in the SQL below) -- at
// directory scale (dozens of listings) this is simpler and just as fast as
// adding a 4th dimension to the tagged-template query shapes, and avoids
// building raw SQL strings.
export async function getApprovedBusinesses(filters = {}) {
  const sql = getDb();
  const { categorySlug, q, tagSlug } = filters;

  // Built with sql.query-style tagged template composition kept simple:
  // three explicit query shapes instead of building raw SQL strings, so
  // there's no risk of accidental injection.
  let rows;
  if (categorySlug && q) {
    rows = await sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved'
        AND c.slug = ${categorySlug}
        AND (b.name ILIKE ${'%' + q + '%'} OR b.description ILIKE ${'%' + q + '%'})
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  } else if (categorySlug) {
    rows = await sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved' AND c.slug = ${categorySlug}
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  } else if (q) {
    rows = await sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved'
        AND (b.name ILIKE ${'%' + q + '%'} OR b.description ILIKE ${'%' + q + '%'})
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  } else {
    rows = await sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved'
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  }

  const withTags = await attachTags(rows);
  if (!tagSlug) return withTags;
  return withTags.filter((b) => b.tags.some((t) => t.slug === tagSlug));
}

export async function getBusinessBySlug(slug) {
  const sql = getDb();
  const rows = await sql`
    SELECT b.*, c.name AS category_name, c.slug AS category_slug
    FROM businesses b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.slug = ${slug} AND b.status = 'approved'
    LIMIT 1
  `;
  if (!rows[0]) return null;
  const [withTags] = await attachTags(rows);
  return withTags;
}

// Admin-only: fetch businesses by moderation status ('pending', 'approved',
// 'rejected', or 'all'), including unapproved ones. Used by /admin, which is
// protected by src/middleware.js -- never call this from a public page.
export async function getBusinessesByStatus(status) {
  const sql = getDb();

  let rows;
  if (status === 'all') {
    rows = await sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      ORDER BY b.submitted_at DESC
    `;
  } else {
    rows = await sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = ${status}
      ORDER BY b.submitted_at DESC
    `;
  }

  return attachTags(rows);
}

// Admin-only: replace a business's tag set entirely with tagIds (array of
// numbers). Used by /admin's per-business "Save tags" form.
export async function setBusinessTags(businessId, tagIds) {
  const sql = getDb();
  const ids = [...new Set((tagIds || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))];

  await sql`DELETE FROM business_tags WHERE business_id = ${businessId}`;
  if (ids.length === 0) return;

  await sql`
    INSERT INTO business_tags (business_id, tag_id)
    SELECT ${businessId}, tag_id FROM UNNEST(${ids}::int[]) AS tag_id
    ON CONFLICT (business_id, tag_id) DO NOTHING
  `;
}

// Admin-only: fix typos/mistakes a business owner made at signup. Only
// description and address are editable here (the fields Andrew asked for) --
// name/phone/email/etc. can be added the same way later if needed.
// If the address text actually changed, re-geocode it so the map pin stays
// in sync (best-effort, same as submit-business.js -- never blocks the
// save if Nominatim fails or the address can't be found).
export async function updateBusinessDetails(businessId, { description, address }) {
  const sql = getDb();

  const [current] = await sql`SELECT address FROM businesses WHERE id = ${businessId}`;
  if (!current) return null;

  const addressChanged = address !== current.address;
  const coords = addressChanged ? await geocodeAddress(address) : null;

  if (addressChanged) {
    await sql`
      UPDATE businesses
      SET description = ${description},
          address = ${address},
          latitude = ${coords?.latitude ?? null},
          longitude = ${coords?.longitude ?? null}
      WHERE id = ${businessId}
    `;
  } else {
    await sql`
      UPDATE businesses SET description = ${description}
      WHERE id = ${businessId}
    `;
  }

  return { geocoded: addressChanged ? Boolean(coords) : null };
}

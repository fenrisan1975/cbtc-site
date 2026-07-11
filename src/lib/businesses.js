import { getDb } from './db.js';

export async function getCategories() {
  const sql = getDb();
  return sql`SELECT id, name, slug FROM categories ORDER BY sort_order ASC, name ASC`;
}

// filters: { categorySlug?: string, q?: string }
export async function getApprovedBusinesses(filters = {}) {
  const sql = getDb();
  const { categorySlug, q } = filters;

  // Built with sql.query-style tagged template composition kept simple:
  // three explicit query shapes instead of building raw SQL strings, so
  // there's no risk of accidental injection.
  if (categorySlug && q) {
    return sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved'
        AND c.slug = ${categorySlug}
        AND (b.name ILIKE ${'%' + q + '%'} OR b.description ILIKE ${'%' + q + '%'})
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  }

  if (categorySlug) {
    return sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved' AND c.slug = ${categorySlug}
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  }

  if (q) {
    return sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      WHERE b.status = 'approved'
        AND (b.name ILIKE ${'%' + q + '%'} OR b.description ILIKE ${'%' + q + '%'})
      ORDER BY b.favorite_count DESC, b.name ASC
    `;
  }

  return sql`
    SELECT b.*, c.name AS category_name, c.slug AS category_slug
    FROM businesses b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.status = 'approved'
    ORDER BY b.favorite_count DESC, b.name ASC
  `;
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
  return rows[0] || null;
}

// Admin-only: fetch businesses by moderation status ('pending', 'approved',
// 'rejected', or 'all'), including unapproved ones. Used by /admin, which is
// protected by src/middleware.js -- never call this from a public page.
export async function getBusinessesByStatus(status) {
  const sql = getDb();

  if (status === 'all') {
    return sql`
      SELECT b.*, c.name AS category_name, c.slug AS category_slug
      FROM businesses b
      LEFT JOIN categories c ON c.id = b.category_id
      ORDER BY b.submitted_at DESC
    `;
  }

  return sql`
    SELECT b.*, c.name AS category_name, c.slug AS category_slug
    FROM businesses b
    LEFT JOIN categories c ON c.id = b.category_id
    WHERE b.status = ${status}
    ORDER BY b.submitted_at DESC
  `;
}

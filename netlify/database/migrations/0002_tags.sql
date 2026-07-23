-- Constance Bay Trading Company -- tags
-- Applied automatically by Netlify on every deploy (production and preview),
-- same as 0001_init.sql.
--
-- Adds a many-to-many tag system alongside the existing single-select
-- categories. Categories stay as the 6 broad top-level sections; tags are
-- finer, non-exclusive facets (a business can carry more than one) so the
-- "Services" category -- which ended up holding 11 of the first 17 listings
-- -- can be searched/filtered more usefully without breaking the existing
-- category browse UX.

CREATE TABLE IF NOT EXISTS tags (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS business_tags (
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (business_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_business_tags_tag ON business_tags(tag_id);

-- Starter taxonomy -- derived from the first 17 real listings (2026-07-22
-- scan), not guesswork. "Services" alone covered IT, cleaning, roofing,
-- general contracting, septic, wellness/reiki, esthetics, bookkeeping, and
-- daycare, so the split below is grouped by what a searcher would actually
-- look for. Andrew/admin can add more via the admin panel or a future
-- migration as the directory grows.
INSERT INTO tags (name, slug, sort_order) VALUES
  ('Home & Trades',           'home-trades',            1),
  ('Wellness & Beauty',       'wellness-beauty',         2),
  ('Professional Services',   'professional-services',   3),
  ('Family & Kids',           'family-kids',             4),
  ('Automotive',              'automotive',              5),
  ('Handmade & Local Goods',  'handmade-local-goods',    6),
  ('Outdoor & Fitness',       'outdoor-fitness',          7),
  ('Animal & Wildlife',       'animal-wildlife',          8)
ON CONFLICT (slug) DO NOTHING;

-- Backfill: assign each of the 17 existing approved listings (as of
-- 2026-07-22) a starting tag based on its description, matched by slug so
-- this is safe to re-run. Admin can add/change tags per business afterward
-- from /admin -- this is a starting point, not a permanent assignment.
INSERT INTO business_tags (business_id, tag_id)
SELECT b.id, t.id
FROM (VALUES
  ('asit',                        'professional-services'),
  ('bay-valley-cleaning',         'home-trades'),
  ('reno-by-melvin',              'home-trades'),
  ('softhands-and-sourdough',     'handmade-local-goods'),
  ('flourish-with-falen',         'wellness-beauty'),
  ('humphreys-roofing',           'home-trades'),
  ('kenzgear',                    'handmade-local-goods'),
  ('brittney-finch-esthetics',    'wellness-beauty'),
  ('edgewood-links',              'outdoor-fitness'),
  ('holly-s-haven-wildlife-rescue','animal-wildlife'),
  ('mint-contracting-company',    'home-trades'),
  ('ottawa-septic-inspections',   'home-trades'),
  ('statewood-car-detailing',     'automotive'),
  ('taka-consulting',             'professional-services'),
  ('total-strength-conditioning', 'outdoor-fitness'),
  ('the-tot-spot',                'family-kids'),
  ('the-soap-spot',               'handmade-local-goods')
) AS starter_tags(business_slug, tag_slug)
JOIN businesses b ON b.slug = starter_tags.business_slug
JOIN tags t ON t.slug = starter_tags.tag_slug
ON CONFLICT (business_id, tag_id) DO NOTHING;

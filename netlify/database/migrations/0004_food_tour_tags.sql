-- Constance Bay Trading Company -- Food & Dining / Tours & Experiences tags (2026-07-24)
-- Applied automatically by Netlify on every deploy, same as 0001-0003.
--
-- "Handmade & Local Goods" had quietly become a catch-all covering bread,
-- honey, soap, apparel, balloons, and firewood -- the same overload problem
-- that motivated the original tag split. Adding two narrower tags:
--   - Food & Dining: anything you'd search for when hungry (restaurants,
--     food trucks/chip wagons, bakers, farm food). Applied alongside
--     Handmade & Local Goods where a listing is genuinely both (e.g. an
--     artisan baker), not as a replacement.
--   - Tours & Experiences: guided trips/experiences, currently a single
--     listing (Unexpected Journeys) but no existing tag fit it at all.

INSERT INTO tags (name, slug, sort_order) VALUES
  ('Food & Dining',       'food-dining',        9),
  ('Tours & Experiences', 'tours-experiences',  10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO business_tags (business_id, tag_id)
SELECT b.id, t.id
FROM (VALUES
  ('archies-fries',            'food-dining'),
  ('bay-sweet-bay',            'food-dining'),
  ('softhands-and-sourdough',  'food-dining'),
  ('baybees-honey',            'food-dining'),
  ('unexpected-journeys',      'tours-experiences')
) AS new_tags(business_slug, tag_slug)
JOIN businesses b ON b.slug = new_tags.business_slug
JOIN tags t ON t.slug = new_tags.tag_slug
ON CONFLICT (business_id, tag_id) DO NOTHING;

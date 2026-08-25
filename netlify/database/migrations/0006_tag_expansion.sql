-- Constance Bay Trading Company -- tag expansion + QA fixes (2026-08-25)
-- Applied automatically by Netlify on next deploy, same as 0001-0005.
--
-- Directory grew from 32 approved listings (2026-07-24) to 48 (2026-08-25).
-- Scanning the live directory found "Professional Services" had become the
-- new catch-all tag (16 of 48 listings, 33%) -- the same overload pattern
-- that originally motivated the category-to-tag split. It had absorbed
-- three genuinely distinct groups: finance/consulting, photo/video
-- production, and one healthcare-adjacent listing that didn't fit
-- Wellness & Beauty (that tag reads as spa/esthetics, not clinical
-- therapy). Splitting those out below. Also adding a one-off Civic
-- Services tag for a constituency-office listing that no existing tag
-- fit at all.

INSERT INTO tags (name, slug, sort_order) VALUES
  ('Business & Finance',  'business-finance',  11),
  ('Creative & Media',    'creative-media',    12),
  ('Health & Therapy',    'health-therapy',    13),
  ('Civic Services',      'civic-services',    14)
ON CONFLICT (slug) DO NOTHING;

-- Assign the new tags to the listings that motivated them.
INSERT INTO business_tags (business_id, tag_id)
SELECT b.id, t.id
FROM (VALUES
  ('taka-consulting',                     'business-finance'),
  ('asit',                                'business-finance'),
  ('ms-consulting',                       'business-finance'),
  ('balanced-solutions-cpa',              'business-finance'),
  ('creations-photography',               'creative-media'),
  ('melissa-toye-photography',            'creative-media'),
  ('mvsl-production-services',            'creative-media'),
  ('apis-speech-and-language-services',   'health-therapy'),
  ('karen-mccrimmon-mpp-kanata-carleton', 'civic-services')
) AS new_tags(business_slug, tag_slug)
JOIN businesses b ON b.slug = new_tags.business_slug
JOIN tags t ON t.slug = new_tags.tag_slug
ON CONFLICT (business_id, tag_id) DO NOTHING;

-- These listings now have a more precise tag than "Professional Services" --
-- remove the old catch-all so it actually shrinks back down, rather than
-- just growing a second tag alongside it.
DELETE FROM business_tags
USING businesses b, tags t
WHERE business_tags.business_id = b.id
  AND business_tags.tag_id = t.id
  AND t.slug = 'professional-services'
  AND b.slug IN (
    'taka-consulting',
    'asit',
    'ms-consulting',
    'balanced-solutions-cpa',
    'creations-photography',
    'melissa-toye-photography',
    'mvsl-production-services',
    'apis-speech-and-language-services'
  );

-- Data fix: Sandra Forbes Canadian Artist had no category at all (only a
-- tag) -- likely dropped at submission/approval time. Shops & Retail
-- matches other solo makers/artists in the directory.
UPDATE businesses
SET category_id = (SELECT id FROM categories WHERE slug = 'shops-retail')
WHERE slug = 'sandra-forbes-canadian-artist';

-- Recategorize Maple Creek Firewood: it was sitting in Outdoors &
-- Recreation, which otherwise means golf/fitness/guided tours. Shops &
-- Retail (selling/delivering a product) fits better among the 6 broad
-- categories. Also tagging it Home & Trades alongside its existing
-- Handmade & Local Goods tag, since firewood delivery is a heating/home
-- good, not really "outdoors recreation".
UPDATE businesses
SET category_id = (SELECT id FROM categories WHERE slug = 'shops-retail')
WHERE slug = 'maple-creek-firewood';

INSERT INTO business_tags (business_id, tag_id)
SELECT b.id, t.id
FROM businesses b, tags t
WHERE b.slug = 'maple-creek-firewood' AND t.slug = 'home-trades'
ON CONFLICT (business_id, tag_id) DO NOTHING;

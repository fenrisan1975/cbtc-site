-- Constance Bay Trading Company -- tag QA fixes (2026-07-24)
-- Applied automatically by Netlify on every deploy, same as 0001/0002.
--
-- Directory grew from 17 to 32 approved listings between 2026-07-22 and
-- 2026-07-24. Spot-checking tags on the new listings found:
--   1. Bay Sweet Bay and Archies Fries and Unexpected Journeys had no tags.
--   2. Chris Smith Real Estate was tagged "Family & Kids", which doesn't
--      fit a real estate broker -- "Professional Services" is the right fit.
--
-- Bay Sweet Bay is a home baker, same pattern as Softhands and Sourdough /
-- Baybees Honey, so it gets Handmade & Local Goods.
--
-- Archies Fries (chip wagon/fast food) and Unexpected Journeys (guided road
-- trip tours) don't fit any of the current 8 tags -- forcing a mismatched
-- tag would be worse than leaving them untagged. Left as-is here; consider
-- a "Food & Dining" and/or "Tours & Experiences" tag in a future migration
-- if more listings like these come in.

-- Fix 1: Bay Sweet Bay -> Handmade & Local Goods
INSERT INTO business_tags (business_id, tag_id)
SELECT b.id, t.id
FROM businesses b, tags t
WHERE b.slug = 'bay-sweet-bay' AND t.slug = 'handmade-local-goods'
ON CONFLICT (business_id, tag_id) DO NOTHING;

-- Fix 2: Chris Smith Real Estate -> swap Family & Kids for Professional Services
DELETE FROM business_tags
USING businesses b, tags t
WHERE business_tags.business_id = b.id
  AND business_tags.tag_id = t.id
  AND b.slug = 'chris-smith-real-estate'
  AND t.slug = 'family-kids';

INSERT INTO business_tags (business_id, tag_id)
SELECT b.id, t.id
FROM businesses b, tags t
WHERE b.slug = 'chris-smith-real-estate' AND t.slug = 'professional-services'
ON CONFLICT (business_id, tag_id) DO NOTHING;

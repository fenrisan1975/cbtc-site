-- Constance Bay Trading Company -- initial schema
-- Applied automatically by Netlify on every deploy (production and preview).
-- Naming: <number>_<slug>.sql -- Netlify sorts and applies these in order.

CREATE TABLE IF NOT EXISTS categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS businesses (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description   TEXT,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  website       TEXT,
  hours         TEXT,
  photo_url     TEXT,
  -- moderation: every new submission starts as 'pending' and only shows on the
  -- public directory once you flip it to 'approved'. See SETUP.md for how to
  -- approve entries (direct SQL for v1 -- no admin UI yet).
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  favorite_count INTEGER NOT NULL DEFAULT 0,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category_id);

-- One favorite per (business, browser). client_token is a random ID the
-- frontend generates and stores in localStorage -- no user accounts needed.
CREATE TABLE IF NOT EXISTS favorites (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_token  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, client_token)
);

-- Starter categories -- placeholders. The kids' "Map the Bay" mission
-- (see constancebaytrading-kids-mission-sheet) should refine/replace these
-- with real categories that fit what Constance Bay actually has.
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Food & Drink',        'food-drink',        1),
  ('Outdoors & Recreation','outdoors-recreation',2),
  ('Shops & Retail',      'shops-retail',       3),
  ('Services',            'services',           4),
  ('Community & Non-Profit','community-non-profit',5),
  ('Accommodation',       'accommodation',      6)
ON CONFLICT (slug) DO NOTHING;

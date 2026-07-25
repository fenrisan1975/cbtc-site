-- Add lat/lng columns so businesses can be plotted on the directory map.
-- Applied automatically by Netlify on next deploy, same as prior migrations.
-- Nullable: not every listing will be geocoded immediately -- new
-- submissions get geocoded automatically (see src/lib/geocode.js), and
-- existing listings are backfilled via scripts/geocode-existing.js
-- (see SETUP.md).

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_businesses_geo ON businesses(latitude, longitude);

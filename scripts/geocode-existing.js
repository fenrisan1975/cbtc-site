// One-off backfill: geocodes existing businesses that have an address but
// no lat/lng yet (everything submitted before the map feature existed).
// New submissions geocode themselves automatically going forward -- see
// src/pages/api/submit-business.js -- this script is only for the backlog.
//
// Run locally against the REAL database (not `astro dev`'s missing DB):
//   netlify link          (once, if you haven't already)
//   netlify dev:exec node scripts/geocode-existing.js
//
// Deliberately slow: Nominatim's usage policy caps requests at ~1/second
// (https://operations.osmfoundation.org/policies/nominatim/), so this
// script waits 1.1s between lookups. For ~32 listings that's under a
// minute -- don't try to parallelize it.

import { getDatabase } from '@netlify/database';
import { geocodeAddress } from '../src/lib/geocode.js';

const sql = getDatabase().sql;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const rows = await sql`
    SELECT id, name, address
    FROM businesses
    WHERE address IS NOT NULL AND address != ''
      AND (latitude IS NULL OR longitude IS NULL)
    ORDER BY id ASC
  `;

  console.log(`Found ${rows.length} businesses needing geocoding.\n`);

  let succeeded = 0;
  let failed = 0;

  for (const row of rows) {
    const coords = await geocodeAddress(row.address);

    if (coords) {
      await sql`
        UPDATE businesses SET latitude = ${coords.latitude}, longitude = ${coords.longitude}
        WHERE id = ${row.id}
      `;
      console.log(`✓ ${row.name} — ${row.address} → ${coords.latitude}, ${coords.longitude}`);
      succeeded += 1;
    } else {
      console.log(`✗ ${row.name} — ${row.address} — could not geocode, skipped`);
      failed += 1;
    }

    await sleep(1100); // stay under Nominatim's ~1 req/sec limit
  }

  console.log(`\nDone. ${succeeded} geocoded, ${failed} failed/skipped.`);
  if (failed > 0) {
    console.log('Failed ones likely have a vague or malformed address — fix the address in /admin and re-run this script.');
  }
}

main().catch((err) => {
  console.error('Backfill script crashed:', err);
  process.exit(1);
});

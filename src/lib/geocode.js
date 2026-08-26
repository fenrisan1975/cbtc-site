// Turns a street address into { latitude, longitude } using OpenStreetMap's
// Nominatim geocoder -- free, no API key/billing needed (chosen to match the
// Leaflet/OSM map on the directory page). Usage policy requires a real
// User-Agent identifying the app and caps requests at roughly 1/second:
// https://operations.osmfoundation.org/policies/nominatim/
// That's fine here -- geocoding only happens once per new submission
// (see submit-business.js) or in a slow, deliberately-throttled backfill
// (scripts/geocode-existing.js, or the "Backfill map pins" button on
// /admin), never on every page view.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ConstanceBayTradingCompany/1.0 (constancebaytrading.com)';

// The directory covers all of West Carleton, not just Constance Bay proper
// (Arnprior, Kinburn, Dunrobin, Woodlawn, Fitzroy Harbour, etc. all show up
// in real listings) -- so the viewbox bias needs to cover that whole area,
// not just the bay itself. This is a soft bias (bounded=0 below), not a
// hard restriction.
const WEST_CARLETON_VIEWBOX = '-76.45,45.50,-75.85,45.25'; // lon1,lat1,lon2,lat2

const HAS_PROVINCE_OR_COUNTRY = /\b(ontario|canada)\b/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Appends ", Ontario, Canada" only if the text doesn't already mention
// either -- avoids stacking redundant/contradictory context.
function withProvinceContext(text) {
  const t = (text || '').trim();
  if (!t) return null;
  return HAS_PROVINCE_OR_COUNTRY.test(t) ? t : `${t}, Ontario, Canada`;
}

// Builds a list of query strings to try in order, from most to least
// specific. Previously this always force-appended ", Constance Bay,
// Ontario, Canada" -- which broke addresses that already named a
// different real West Carleton hamlet (e.g. "375 Daniel St S, Arnprior"
// became "...Arnprior, Constance Bay, Ontario, Canada", matching nothing).
function buildCandidateQueries(rawAddress) {
  const candidates = [];
  const seen = new Set();
  const push = (q) => {
    if (q && !seen.has(q)) {
      seen.add(q);
      candidates.push(q);
    }
  };

  // 1. The address as given, plus province/country context if missing.
  push(withProvinceContext(rawAddress));

  // 2. Just the last comma-separated segment -- usually the town/hamlet
  // name ("2898 Galetta Sd Rd, Kinburn" -> "Kinburn"). Vague addresses
  // with no street number ("Dunrobin Shores") also benefit: this collapses
  // to roughly the same query as #1, which is fine.
  const commaParts = rawAddress.split(',');
  if (commaParts.length > 1) {
    push(withProvinceContext(commaParts[commaParts.length - 1]));
  }

  // 3. Addresses naming two places ("Dunrobin / Kinburn", "Dunrobin and
  // Kinburn") -- try the first one alone. An approximate pin in the right
  // general area beats no pin at all for a local business directory.
  const multiPlaceParts = rawAddress
    .split(/[/&]| and /i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (multiPlaceParts.length > 1) {
    push(withProvinceContext(multiPlaceParts[0]));
  }

  return candidates;
}

async function queryNominatim(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    viewbox: WEST_CARLETON_VIEWBOX,
    bounded: '0', // bias, don't hard-restrict -- some listings may be just outside this box
  });

  try {
    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;

    const results = await res.json();
    const first = results[0];
    if (!first) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null; // network error, rate-limited, malformed response, etc.
  }
}

// Returns { latitude, longitude } or null if the address can't be found
// under any fallback, or the request fails. Never throws -- callers treat
// geocoding as best-effort and shouldn't let it block a submission.
export async function geocodeAddress(address) {
  const trimmed = (address || '').trim();
  if (!trimmed) return null;

  const candidates = buildCandidateQueries(trimmed);

  for (let i = 0; i < candidates.length; i++) {
    // Space out fallback attempts too, not just calls between different
    // businesses -- stay under Nominatim's ~1 req/sec usage policy even
    // when one business needs multiple tries.
    if (i > 0) await sleep(1100);

    const coords = await queryNominatim(candidates[i]);
    if (coords) return coords;
  }

  return null;
}

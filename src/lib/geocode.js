// Turns a street address into { latitude, longitude } using OpenStreetMap's
// Nominatim geocoder -- free, no API key/billing needed (chosen to match the
// Leaflet/OSM map on the directory page). Usage policy requires a real
// User-Agent identifying the app and caps requests at roughly 1/second:
// https://operations.osmfoundation.org/policies/nominatim/
// That's fine here -- geocoding only happens once per new submission
// (see submit-business.js) or in a slow, deliberately-throttled backfill
// script (scripts/geocode-existing.js), never on every page view.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'ConstanceBayTradingCompany/1.0 (constancebaytrading.com)';

// Constance Bay is a small community west of Ottawa. Biasing the search to
// a viewbox around it (without hard-restricting to it, in case a business
// address is just outside) makes ambiguous street addresses ("123 Bayview
// Drive") resolve correctly instead of matching some other "Bayview Drive"
// in the world.
const CONSTANCE_BAY_VIEWBOX = '-76.22,45.40,-76.05,45.31'; // lon1,lat1,lon2,lat2

// Returns { latitude, longitude } or null if the address can't be found or
// the request fails. Never throws -- callers treat geocoding as best-effort
// and shouldn't let it block a submission.
export async function geocodeAddress(address) {
  const trimmed = (address || '').trim();
  if (!trimmed) return null;

  // Most submitted addresses won't include "Constance Bay" / "Ontario" --
  // append them so Nominatim has enough context to disambiguate.
  const query = /constance bay/i.test(trimmed) ? trimmed : `${trimmed}, Constance Bay, Ontario, Canada`;

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    viewbox: CONSTANCE_BAY_VIEWBOX,
    bounded: '0', // bias, don't hard-restrict -- some listings may be just outside the bay
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

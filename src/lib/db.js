// Thin helper around Netlify's own database client.
// @netlify/database automatically connects to the right database branch
// for the current environment (production, deploy preview, or the local
// emulated database under `netlify dev`) -- no connection string or env
// var to configure by hand.
import { getDatabase } from '@netlify/database';

let cached;

export function getDb() {
  if (cached) return cached;
  cached = getDatabase().sql;
  return cached;
}

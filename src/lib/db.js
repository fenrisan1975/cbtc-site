// Thin helper around the Neon serverless Postgres driver.
// Netlify DB automatically sets NETLIFY_DATABASE_URL as an env var once
// you enable it for this site (see SETUP.md) -- nothing to configure here.
import { neon } from '@neondatabase/serverless';

let cached;

export function getDb() {
  if (cached) return cached;

  const url = process.env.NETLIFY_DATABASE_URL;
  if (!url) {
    throw new Error(
      'NETLIFY_DATABASE_URL is not set. Enable Netlify DB for this site ' +
      '(Site settings > Database) -- see SETUP.md.'
    );
  }

  cached = neon(url);
  return cached;
}

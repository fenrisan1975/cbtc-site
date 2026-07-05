// Run with: npm run db:migrate
// Applies db/schema.sql against whatever NETLIFY_DATABASE_URL points to.
// Safe to run more than once -- everything in schema.sql uses
// IF NOT EXISTS / ON CONFLICT DO NOTHING.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NETLIFY_DATABASE_URL;
if (!url) {
  console.error(
    'NETLIFY_DATABASE_URL is not set.\n' +
    'Run `netlify env:list` to check, or `netlify dev` (which injects it locally),\n' +
    'or paste the value from Netlify\'s dashboard into your shell before running this.'
  );
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

// Split on semicolons at the end of a line -- good enough for this schema
// file, which has no semicolons inside string literals.
const statements = schema
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  console.log('Running:', statement.slice(0, 60).replace(/\n/g, ' '), '...');
  await sql(statement);
}

console.log(`Done -- ran ${statements.length} statements.`);

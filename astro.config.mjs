import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

// Server output: business listings and the submission/favorite endpoints all
// need to read/write the database per-request, so this can't be a fully
// static build. The Netlify adapter turns this into Netlify Functions
// automatically at build/deploy time -- no separate functions folder needed.
export default defineConfig({
  output: 'server',
  adapter: netlify(),
});

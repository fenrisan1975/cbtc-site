# Setting up the CBTC directory site

This is an Astro site (server-rendered) that reads/writes a Postgres database
(Netlify DB) and sends signups to Mailchimp. It was written by hand without
being able to run `npm install` in the environment that built it (no
network access to the npm registry there) -- so **please run through this
setup carefully and test locally before deploying**, the way you would with
any new codebase.

## 0. What you need

- Node.js installed (v20 or newer -- check with `node -v`)
- A GitHub account (or GitLab/Bitbucket) to hold the code -- Netlify deploys
  this kind of site from a connected git repo, not a drag-and-drop zip like
  the teaser
- Your existing Netlify account (same one hosting the teaser)
- A Mailchimp account

## 1. Get the code into git

From inside this folder:

```
git init
git add .
git commit -m "Initial CBTC directory site"
```

Then create a new repo on GitHub and push it there (GitHub will show you the
exact commands when you create an empty repo -- something like):

```
git remote add origin https://github.com/<you>/cbtc-site.git
git push -u origin main
```

## 2. Install dependencies and test locally

```
npm install
```

If this fails on version numbers, it's likely because a package version I
picked doesn't exist anymore -- open `package.json` and loosen/bump the
version, or just delete the version number entirely and run
`npm install astro @astrojs/netlify @neondatabase/serverless` fresh to get
whatever's current.

Then:

```
npx astro dev
```

This should start a local dev server (probably http://localhost:4321). Pages
that hit the database (directory, submit) will error until you've set up
Netlify DB and pointed `NETLIFY_DATABASE_URL` at it locally (step 3-4) --
that's expected at this point.

## 3. Create a new Netlify site from this repo

In the Netlify dashboard: **Add new site > Import an existing project**,
pick the GitHub repo you just pushed. Build command and publish directory
are already set in `netlify.toml`, so you shouldn't need to touch them.

(You can point this at a brand new Netlify site, or -- if you'd rather reuse
the existing one that's serving the teaser -- ask me and I'll walk through
switching that site from "manual deploys" to "deploys from git" instead;
it's a bit more involved since it changes how you push updates.)

## 4. Enable Netlify DB

In the new site's dashboard: **Site settings > Database** (or search
"Database" in site settings) > follow the prompt to provision a database.
Netlify will automatically set the `NETLIFY_DATABASE_URL` environment
variable for you -- you don't need to copy/paste a connection string
yourself.

To run things locally against that same database, install the Netlify CLI
(`npm install -g netlify-cli`), run `netlify link` inside this folder to
connect it to the site, then `netlify dev` instead of `npx astro dev` --
that pulls down the real environment variables (including the database
URL) so local testing behaves like production.

## 5. Create the database tables

With the database linked (previous step), run:

```
npm run db:migrate
```

This applies `db/schema.sql` -- creates the `businesses`, `categories`, and
`favorites` tables, and seeds six starter categories (placeholders -- swap
these for whatever the kids come up with in their "Map the Bay" mission).

If that script gives you trouble, the fallback is to open the database
directly (Netlify's dashboard links out to the Neon console) and paste the
contents of `db/schema.sql` into its SQL editor.

## 6. Set up Mailchimp

1. In Mailchimp, create (or use an existing) Audience.
2. Get your API key: Account > Extras > API keys > Create a Key. The key
   looks like `abc123...-us21` -- the part after the last dash (`us21`) is
   your server prefix.
3. Get your Audience ID: Audience > Settings > Audience name and defaults.
4. In Netlify: **Site settings > Environment variables**, add:
   - `MAILCHIMP_API_KEY`
   - `MAILCHIMP_SERVER_PREFIX`
   - `MAILCHIMP_AUDIENCE_ID`

## 7. Approving business submissions

There's no admin screen for this yet (v1) -- approving is a one-line SQL
statement run against the database (via the Neon console, linked from
Netlify's Database settings page):

```sql
UPDATE businesses
SET status = 'approved', approved_at = now()
WHERE id = 123;   -- swap in the business's id
```

To see what's waiting for review:

```sql
SELECT id, name, email, submitted_at FROM businesses WHERE status = 'pending' ORDER BY submitted_at;
```

## 8. Deploy

Once steps 1-6 are done, push to your git repo's main branch and Netlify
will build and deploy automatically. Check the deploy log for errors --
since this wasn't build-tested on my end, that first deploy is the real
test.

## What's not built yet

- No admin UI for approving businesses (direct SQL for now, see step 7)
- No photo upload for business listings (`photo_url` column exists in the
  schema, but there's no upload form yet -- Netlify Blobs would be the
  natural fit when you want this)
- No loyalty points/stamp system yet -- that's a separate phase

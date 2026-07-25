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
`npm install astro @astrojs/netlify @netlify/database` fresh to get
whatever's current.

Then:

```
npx astro dev
```

This should start a local dev server (probably http://localhost:4321). Pages
that hit the database (directory, submit) will error until you've linked
Netlify DB (steps 3-4) and run `netlify dev` instead -- that's expected at
this point.

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
The code talks to it through the `@netlify/database` package, which
connects automatically for whichever environment it's running in
(production, deploy preview, or local dev) -- there's no connection string
to copy or paste anywhere.

To run things locally against that same database, install the Netlify CLI
(`npm install -g netlify-cli`), run `netlify link` inside this folder to
connect it to the site, then use `netlify dev` instead of `npx astro dev` --
this starts an emulated local database that mirrors production.

## 5. Create the database tables

The schema lives in `netlify/database/migrations/0001_init.sql`. Netlify
applies it **automatically** on every production deploy and deploy preview
-- there's nothing to run by hand once the code is pushed (step 8).

For local testing with `netlify dev`, apply it once yourself:

```
netlify database migrations apply
```

This creates the `businesses`, `categories`, and `favorites` tables, and
seeds six starter categories (placeholders -- swap these for whatever the
kids come up with in their "Map the Bay" mission).

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

There's now a password-protected admin page at `/admin` for this -- no more
manual SQL needed.

1. Pick a long, random password and add it as an environment variable in
   Netlify: **Site settings > Environment variables** > `ADMIN_PASSWORD`.
   (Also add it to your local `.env` if you want to test `/admin` with
   `netlify dev`.)
2. Visit `yoursite.com/admin/login`, enter the password.
3. You'll land on `/admin`, which lists pending submissions with **Approve**
   and **Reject** buttons. Tabs at the top switch between Pending / Approved
   / Rejected / All.
4. There's a **Log out** button on the dashboard; the session cookie also
   expires after 7 days on its own.

This is a single shared password (not per-user accounts) since there's only
one admin for now -- see `src/lib/adminAuth.js` and `src/middleware.js` for
how the session is protected.

If you ever need to bypass the UI, the old direct-SQL approach still works:

```
netlify database connect --query "UPDATE businesses SET status = 'approved', approved_at = now() WHERE id = 123;"
```

To see what's waiting for review:

```
netlify database connect --query "SELECT id, name, email, submitted_at FROM businesses WHERE status = 'pending' ORDER BY submitted_at;"
```

Or run `netlify database connect` with no `--query` to drop into an
interactive `psql` session and type SQL directly.

## 8. Kids' access: admin login + email addresses

James and Amelia get the same `/admin` password as you (step 7) -- there's
no per-kid account system, so just share it with them directly. They'll be
able to approve/reject listings and edit tags, same as you.

`andrew@constancebaytrading.com` already exists as a real mailbox on
**Microsoft 365 from GoDaddy** (not Cloudflare Email Routing -- using
Cloudflare would conflict with the MX records GoDaddy/Microsoft already set
up for the domain, so don't enable Email Routing there).

The free option -- **email aliases on your existing mailbox** -- gets James
and Amelia their own address with mail landing in your inbox, no extra
Microsoft 365 seats to pay for:

1. Go to your GoDaddy account > **Email & Office** > manage the
   `andrew@constancebaytrading.com` mailbox (or go directly to
   admin.microsoft.com if GoDaddy hands you off there).
2. Find that mailbox's **email aliases** setting (in the Microsoft 365 admin
   center: Users > Active users > pick the mailbox > Manage username and
   email > + Add an alias). Add:
   - `james@constancebaytrading.com`
   - `amelia@constancebaytrading.com`
3. No DNS changes needed for this part -- the domain's already verified on
   this Microsoft 365 tenant. Mail sent to either alias (including the
   notification emails from step 8.1 below) lands directly in your existing
   inbox, same as mail sent to `andrew@`.

If you'd rather James and Amelia have a real separate inbox they log into
themselves (own password, own Outlook/webmail), that means buying two more
Microsoft 365 seats through GoDaddy instead of aliases -- worth doing later
if they want to actually reply to businesses themselves, but aliases are the
free/simple starting point.

### 8.1 New-business notification email

The site emails `NOTIFY_EMAILS` the moment someone submits a listing (while
it's still `pending`, before you've approved it) using
[Resend](https://resend.com) to send the mail.

1. Sign up at resend.com (free tier: 3,000 emails/month, plenty here).
2. **Domains > Add Domain** > enter `constancebaytrading.com` > Resend shows
   you 2-3 DNS records (TXT/DKIM) to add. Add those in the Cloudflare DNS
   zone that already holds the site's CNAME records -- these are separate
   TXT records for *sending* mail and won't touch the existing MX records
   GoDaddy/Microsoft 365 uses for *receiving* mail at `andrew@` (step 8).
   Wait for Resend to show the domain as verified (usually a few minutes).
3. **API Keys > Create API Key** > copy it.
4. In Netlify: **Site settings > Environment variables**, add:
   - `RESEND_API_KEY` -- the key from step 3
   - `RESEND_FROM_EMAIL` -- e.g. `notify@constancebaytrading.com` (any
     address on the verified domain works, doesn't need to be a real
     mailbox)
   - `NOTIFY_EMAILS` -- `james@constancebaytrading.com,amelia@constancebaytrading.com,andrew@constancebaytrading.com`
5. Redeploy (or trigger a deploy) so the new env vars take effect. Submit a
   test listing through `/submit` and confirm the email arrives.

If these env vars aren't set, submissions still work fine -- the site just
skips sending the notification (see `src/lib/notify.js`).

## 9. Deploy

Once steps 1-6 are done, push to your git repo's main branch. Netlify will
apply the migration in `netlify/database/migrations/` and then build and
deploy automatically. Check the deploy log for errors -- since this wasn't
build-tested on my end, that first deploy is the real test.

## What's not built yet

- No photo upload for business listings (`photo_url` column exists in the
  schema, but there's no upload form yet -- Netlify Blobs would be the
  natural fit when you want this)
- No loyalty points/stamp system yet -- that's a separate phase

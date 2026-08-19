# Half Marathon Training Plan — with Strava sync

A personal training tracker (12-week half marathon plan, bodyweight strength,
mark-done, reschedule) that syncs completed runs in automatically from Strava.

**Stack:** Supabase (Postgres + Auth + Edge Functions) + a static frontend
hosted on GitHub Pages.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
2. In **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`
   and run it. This creates the `workouts`, `plan_meta`, `strava_tokens`, and
   `app_status` tables with row-level security enabled.
3. In **Authentication → Users**, click **Add user** and create yourself an
   account (email + password). This app is single-user, so you sign in with
   this account — there's no public sign-up form.
4. In **Project Settings → API**, copy your **Project URL** and **anon public
   key**. You'll need these in step 4.

## 2. Register a Strava API application

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) and
   create an application (any name/website is fine for personal use).
2. Set **Authorization Callback Domain** to the domain your app will be
   hosted on (e.g. `yourname.github.io` — no `https://`, no path).
3. Note your **Client ID** and **Client Secret**.

   > Personal use note: Strava only requires app review if other people will
   > use your app. Using it yourself with your own account works immediately.

## 3. Deploy the Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from
this project folder:

```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set STRAVA_CLIENT_ID=xxxx STRAVA_CLIENT_SECRET=xxxx
supabase functions deploy strava-callback
supabase functions deploy strava-sync
```

## 4. Configure the frontend

Open `public/index.html` and fill in the config block near the top:

```html
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  STRAVA_CLIENT_ID: "your-strava-client-id"
};
```

The anon key is safe to expose in frontend code — it's designed for this,
and Row Level Security (already set up by the migration) is what actually
protects your data.

## 5. Push to GitHub and enable Pages

```bash
git init
git add .
git commit -m "Half marathon plan with Strava sync"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Then in your GitHub repo: **Settings → Pages → Source → Deploy from branch**,
choose `main` and folder `/public`, save. Your app will be live at
`https://YOUR-USERNAME.github.io/YOUR-REPO/`.

**Important:** that exact URL must match the Authorization Callback Domain
you set in Strava (step 2), or the OAuth redirect will fail.

## 6. Use it

1. Open your GitHub Pages URL, sign in with the Supabase user you created.
2. Pick your Week 1 start date (a Sunday) and build the plan.
3. On the Home tab, tap **Connect** under Strava — you'll be sent to Strava
   to authorize, then redirected back automatically.
4. Tap **Sync** any time to pull in your recent runs. Any run that lands on
   the same calendar date as a planned (not-yet-done) workout gets marked
   done automatically, with the real distance/time from Strava attached.

---

## How the pieces fit together

- **`workouts` / `plan_meta`** — your plan data, readable/writable by you
  (via Supabase Auth + RLS) directly from the browser.
- **`strava_tokens`** — your Strava access/refresh tokens. Locked down so
  *only* the Edge Functions (using the service role key) can touch this —
  the browser never sees it, which is what keeps your Strava account secure.
- **`strava-callback` function** — exchanges the one-time OAuth `code` for
  tokens right after you authorize, using your Strava client secret (which
  also never reaches the browser).
- **`strava-sync` function** — refreshes the access token if it's expired,
  fetches your recent runs from Strava, and matches them to planned workouts
  by date.

## Extending this

- Add a cron-triggered sync (Supabase supports scheduled Edge Functions) so
  it syncs automatically instead of needing a manual tap.
- Match by more than date (e.g. distance tolerance) if you sometimes run
  more than once a day.
- Swap the date-matching logic in `strava-sync/index.ts` for whatever rule
  fits how you actually train.

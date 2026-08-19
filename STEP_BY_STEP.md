# Step-by-Step: Build This in VS Code, Backed by Supabase, Linked to Strava

**How the pieces fit together, before you start:**
- **VS Code** — where you edit the project and run commands.
- **Supabase** — your backend: database (your plan + workouts), login (just you),
  and two small server-side functions that talk to Strava securely.
- **GitHub Pages** — hosts the actual web page, for free, straight from your repo.
- **Strava** — the source of your real run data.

You'll touch all four, in this order.

---

## Part 1 — Get the project into VS Code

1. Unzip `strava-half-marathon-app.zip` somewhere on your computer.
2. Install [VS Code](https://code.visualstudio.com) if you don't have it.
3. **File → Open Folder…** → select the unzipped `strava-half-marathon-app` folder.
4. Install [Node.js LTS](https://nodejs.org) (needed for the Supabase CLI) and
   [Git](https://git-scm.com) if you don't already have them.
5. Open the integrated terminal: `` Ctrl+` `` — you'll run every command below
   in here.

You should see this in the Explorer sidebar:
```
strava-half-marathon-app/
  public/index.html
  supabase/migrations/0001_init.sql
  supabase/functions/strava-callback/index.ts
  supabase/functions/strava-sync/index.ts
  README.md
  .env.example
```

(Optional but nice: install the **Deno** extension in VS Code so the two
files under `supabase/functions/` get proper syntax support — they run on
Deno, not Node, so VS Code needs the extension to stop flagging `Deno.env`
and `Deno.serve` as errors.)

---

## Part 2 — Set up Supabase (your backend)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name,
   a database password (save it somewhere), and a region close to you. Free
   tier is plenty for a personal app.

2. **Create your database tables.** In the Supabase dashboard, open the
   **SQL Editor**. Back in VS Code, open `supabase/migrations/0001_init.sql`,
   select all (`Cmd/Ctrl+A`), copy, paste into the SQL Editor, and run it.
   This creates four tables — `workouts`, `plan_meta`, `strava_tokens`,
   `app_status` — with Row Level Security already configured so only you can
   read or write your own data.

3. **Create your login.** In Supabase dashboard → **Authentication → Users**
   → **Add user** → enter an email and password for yourself. This app has
   no public sign-up page — you log in with this one account.

4. **Grab your API keys.** Supabase dashboard → **Project Settings → API**.
   Note down:
   - **Project URL** (looks like `https://abcxyz.supabase.co`)
   - **anon public key** (a long string)

   You'll paste both into `public/index.html` in Part 4.

5. **Install and connect the Supabase CLI**, in the VS Code terminal:
   ```bash
   npm install -g supabase
   supabase login
   ```
   This opens a browser tab — approve it, then return to VS Code.
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   ```
   `YOUR-PROJECT-REF` is the subdomain part of your Project URL
   (`abcxyz` in the example above).

---

## Part 3 — Register a Strava app and deploy the functions

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api) →
   create an application. Name/website/icon can be anything for personal use.
2. **Authorization Callback Domain**: enter the domain you'll host on. If
   your GitHub username is `alexrun`, this will be `alexrun.github.io`
   (no `https://`, no trailing slash or path). You can revisit this later if
   your final URL differs.
3. Copy your **Client ID** and **Client Secret** — you'll need both next.

4. Back in VS Code's terminal, set them as Supabase secrets (these stay
   server-side and are never exposed to the browser):
   ```bash
   supabase secrets set STRAVA_CLIENT_ID=your_client_id STRAVA_CLIENT_SECRET=your_client_secret
   ```
5. Deploy the two Edge Functions:
   ```bash
   supabase functions deploy strava-callback
   supabase functions deploy strava-sync
   ```
   These are what actually talk to Strava — one completes the login handshake,
   the other pulls your runs and matches them to planned workouts by date.

---

## Part 4 — Point the frontend at your Supabase project

1. In VS Code, open `public/index.html`.
2. `Cmd/Ctrl+F` → search for `APP_CONFIG` to jump to this block near the top:
   ```html
   window.APP_CONFIG = {
     SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
     SUPABASE_ANON_KEY: "YOUR-SUPABASE-ANON-KEY",
     STRAVA_CLIENT_ID: "YOUR-STRAVA-CLIENT-ID"
   };
   ```
3. Replace all three placeholder values with the ones from Parts 2 and 3.
4. Save (`Cmd/Ctrl+S`).

The anon key is meant to be public in frontend code — Row Level Security
(already set up in Part 2) is what actually protects your data, not secrecy
of this key.

---

## Part 5 — Push to GitHub

Using the VS Code Source Control panel (`Ctrl+Shift+G`) is the easiest path:

1. Click the Source Control icon. VS Code offers to initialize a git repo —
   accept it.
2. Stage all changes (`+` next to "Changes"), type a commit message like
   "Initial commit", click the checkmark to commit.
3. Click **Publish Branch**. VS Code will prompt you to sign into GitHub (if
   you haven't already) and creates the remote repository for you.

Or, in the terminal:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

---

## Part 6 — Turn on GitHub Pages

This part happens on github.com:

1. Go to your repo → **Settings → Pages**.
2. **Source**: Deploy from a branch. **Branch**: `main`. **Folder**: `/public`.
3. Save, then wait a minute or two for the first build.
4. GitHub shows you the live URL — something like
   `https://YOUR-USERNAME.github.io/YOUR-REPO/`.

**Check this matches Strava**: the *domain* (`YOUR-USERNAME.github.io`) needs
to match what you entered as the Authorization Callback Domain in Part 3,
step 2. If it doesn't, go back to your Strava app settings and update it.

---

## Part 7 — Try the whole thing end to end

1. Open your GitHub Pages URL.
2. Sign in with the Supabase user you created (Part 2, step 3).
3. Pick a start date (a Sunday) and build your plan.
4. On Home, tap **Connect** under Strava → you're sent to Strava's
   authorize screen → approve → you land back on your app automatically.
5. Tap **Sync** any time — runs on the same date as a planned (not yet done)
   workout get marked done, with real distance and time attached from Strava.

---

## Making changes afterward

- **Edited `public/index.html`?** → `git add . && git commit -m "..." && git push`
  — GitHub Pages redeploys on its own within a minute or two.
- **Edited a file under `supabase/functions/`?** → re-run
  `supabase functions deploy strava-sync` (or `strava-callback`) — a git push
  alone does *not* redeploy these; that's a separate CLI step.

## If something breaks

- **Strava connect fails or redirects strangely**: double check the
  Authorization Callback Domain in your Strava app settings exactly matches
  your GitHub Pages domain.
- **Sync returns an error**: `supabase functions logs strava-sync` in the VS
  Code terminal shows recent invocations and error messages.
- **Page looks broken or nothing loads**: open browser DevTools (`F12` or
  `Cmd+Option+I`) → Console tab, on your GitHub Pages URL, and check for
  errors — usually a typo in the `APP_CONFIG` values from Part 4.

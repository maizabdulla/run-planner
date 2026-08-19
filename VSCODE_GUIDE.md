# Setting Up the Half Marathon App in VS Code

This walks through the whole process — from unzipping the project to it
being live on GitHub Pages with Strava syncing — using VS Code as your main
tool.

---

## 1. Install what you need

- **VS Code**: [code.visualstudio.com](https://code.visualstudio.com)
- **Node.js** (needed for the Supabase CLI): [nodejs.org](https://nodejs.org) — install the LTS version
- **Git**: usually pre-installed on Mac/Linux; on Windows get it from [git-scm.com](https://git-scm.com)

Recommended VS Code extensions (open the Extensions panel — `Cmd/Ctrl+Shift+X`
— and search for each):
- **Deno** (by denoland) — gives you proper syntax checking for the two
  Supabase Edge Functions, which run on Deno rather than Node.
- **Live Server** (by Ritwick Dey) — lets you preview `index.html` locally
  with one click.
- **GitHub Pull Requests and Issues** (by GitHub) — optional, makes pushing
  to GitHub from VS Code smoother.

---

## 2. Open the project

1. Unzip `strava-half-marathon-app.zip` somewhere on your computer.
2. In VS Code: **File → Open Folder…** and select the unzipped
   `strava-half-marathon-app` folder.
3. You should see this in the Explorer sidebar:
   ```
   strava-half-marathon-app/
     public/index.html
     supabase/migrations/0001_init.sql
     supabase/functions/strava-callback/index.ts
     supabase/functions/strava-sync/index.ts
     README.md
     .env.example
   ```

---

## 3. Open the integrated terminal

`` Ctrl+` `` (backtick) opens VS Code's terminal panel at the bottom — you'll
use this for every command below instead of switching to a separate terminal
app.

---

## 4. Set up Supabase

**Create the project** (in your browser, not VS Code): go to
[supabase.com](https://supabase.com) → New project.

**Run the schema**: in the Supabase dashboard, open **SQL Editor**, paste in
the contents of `supabase/migrations/0001_init.sql` (open it in VS Code,
`Cmd/Ctrl+A` then `Cmd/Ctrl+C`), and run it.

**Create your login**: in Supabase dashboard → **Authentication → Users** →
Add user → enter an email/password for yourself.

**Install the Supabase CLI**, back in the VS Code terminal:
```bash
npm install -g supabase
```

**Log in and link the project**:
```bash
supabase login
```
This opens a browser tab to authorize — approve it, then come back to VS Code.
```bash
supabase link --project-ref YOUR-PROJECT-REF
```
(Find `YOUR-PROJECT-REF` in your Supabase project URL:
`https://YOUR-PROJECT-REF.supabase.co`.)

---

## 5. Register your Strava API app

In your browser: [strava.com/settings/api](https://www.strava.com/settings/api)
→ create an app. For **Authorization Callback Domain**, use the domain
you'll host on — e.g. `yourname.github.io` (no `https://`, no trailing path).
You can change this later if needed.

Copy the **Client ID** and **Client Secret** it gives you.

---

## 6. Set secrets and deploy the Edge Functions

Still in the VS Code terminal:
```bash
supabase secrets set STRAVA_CLIENT_ID=your_client_id STRAVA_CLIENT_SECRET=your_client_secret
supabase functions deploy strava-callback
supabase functions deploy strava-sync
```

If you open `supabase/functions/strava-sync/index.ts` in VS Code with the
Deno extension installed, it'll correctly recognize `Deno.env`, `Deno.serve`,
etc. without red squiggly errors. (If you see errors here without the
extension, that's expected — they're false positives from VS Code assuming
Node.js instead of Deno; the code itself is fine.)

---

## 7. Fill in your config

Open `public/index.html` in VS Code. Use **Find** (`Cmd/Ctrl+F`) to jump to
`APP_CONFIG` near the top of the file, and fill in the three values:

```html
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-public-key",
  STRAVA_CLIENT_ID: "your-strava-client-id"
};
```

Get `SUPABASE_URL` and the anon key from Supabase dashboard → **Project
Settings → API**. Save the file (`Cmd/Ctrl+S`).

---

## 8. Preview it locally (optional, before deploying)

Right-click `public/index.html` in the VS Code Explorer → **Open with Live
Server**. It'll open in your browser at something like
`http://127.0.0.1:5500/public/index.html`.

You can log in and build your plan this way. **Strava connect won't work
yet on localhost** (the callback domain has to match what you registered
with Strava) — that part you'll test once it's deployed in step 10.

---

## 9. Push to GitHub

VS Code has this built in via the **Source Control** panel (the icon that
looks like a branching line, in the left sidebar, or `Ctrl+Shift+G`).

**Option A — using the terminal:**
```bash
git init
git add .
git commit -m "Half marathon plan with Strava sync"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

**Option B — using the Source Control panel:**
1. Click the Source Control icon — VS Code will offer to initialize a repo.
2. Stage all changes (the `+` next to "Changes"), write a commit message,
   click the checkmark to commit.
3. Click **Publish Branch** — VS Code will prompt you to sign into GitHub
   (if not already) and create the remote repository for you.

---

## 10. Turn on GitHub Pages

This step happens on github.com, not in VS Code:
1. Go to your repo → **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Branch: `main`, Folder: `/public`. Save.
4. GitHub will give you a URL like `https://YOUR-USERNAME.github.io/YOUR-REPO/`
   — wait a minute or two for the first deploy.

**Double check**: that URL's domain must exactly match the Authorization
Callback Domain you set in Strava (step 5). If you registered
`yourname.github.io` but your repo path changes the URL, the domain itself
(not the path) is what Strava checks, so this usually just works.

---

## 11. Try it end to end

1. Open your GitHub Pages URL.
2. Sign in with the Supabase user you created.
3. Pick a start date (a Sunday) and build your plan.
4. On the Home tab, tap **Connect** under Strava, authorize, and you'll be
   redirected back automatically.
5. Tap **Sync** to pull in recent runs.

---

## Making changes later

Any time you edit `public/index.html` or the Supabase functions in VS Code:

- **Frontend changes**: just `git add . && git commit -m "..." && git push`
  — GitHub Pages redeploys automatically within a minute or two.
- **Edge Function changes**: re-run `supabase functions deploy strava-sync`
  (or `strava-callback`) after saving your edits — deploying isn't automatic
  from a git push, it's a separate CLI step.

## If something goes wrong

- **Function errors**: `supabase functions logs strava-sync` in the VS Code
  terminal shows recent invocations and any errors.
- **Frontend errors**: open your browser's DevTools (`F12` or `Cmd+Opt+I`)
  → Console tab, while on your GitHub Pages URL.
- **Strava redirect fails**: double-check the callback domain in your Strava
  app settings matches your GitHub Pages domain exactly.

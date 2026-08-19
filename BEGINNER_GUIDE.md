# The Complete Beginner's Guide to Deploying This App

This explains not just *what* to click, but *what's actually happening* and
*why* — so none of it feels like magic. Read the "What this actually means"
boxes even if you're tempted to skip to the commands.

---

## The big picture first

Four separate services, each doing one job:

- **VS Code** — a text editor. You use it to look at and change files. It
  also has a built-in terminal (a place to type commands), which is the only
  "advanced" part.
- **GitHub** — a place that stores your code online and can also turn a
  folder of files into a live website (that's "GitHub Pages").
- **Supabase** — a company that runs a database and some small bits of
  server code for you, so you don't have to rent and manage your own server.
- **Strava** — where your actual run data lives. You're asking Strava's
  permission to let your app read it.

**Why do you need a database at all?** Your training plan (which days,
which distances, what you've completed) has to live *somewhere* so it's
still there tomorrow. A plain webpage by itself forgets everything the
moment you close the tab. Supabase is that "somewhere."

**Why can't the webpage talk to Strava directly?** Strava requires a
"client secret" — a password, essentially — to prove your app is really
your app. If that password were sitting inside your webpage's code,
*anyone* who viewed the page's source could steal it (browsers can't keep
secrets; everything in frontend code is visible to anyone). So the secret
lives on Supabase's servers instead, in a piece of code called an **Edge
Function**, which the webpage talks to instead of talking to Strava
directly.

Keep that one idea in mind — *secrets live on the server, never in the
webpage* — and most of the rest makes sense as a natural consequence.

---

## Part 1: VS Code — getting oriented

**What it is:** a program for editing text/code files, with helpers like
syntax highlighting and a file browser.

1. Install it from [code.visualstudio.com](https://code.visualstudio.com) —
   it's free.
2. Unzip the project folder somewhere you'll remember (Desktop is fine).
3. **File → Open Folder** and select that unzipped folder. You'll see a
   sidebar listing every file in the project.
4. Open the terminal with `` Ctrl+` `` (backtick, usually above Tab).

**What this actually means:** the terminal is a text-only way to run
programs, instead of clicking icons. Every command below, you type into
this terminal and press Enter. It's the same terminal whether it's inside
VS Code or a separate app — VS Code just conveniently keeps it in the same
window as your files.

You'll also want [Node.js](https://nodejs.org) (download the LTS version)
and [Git](https://git-scm.com) installed — both are free, standard tools
that many command-line programs (including Supabase's) depend on.

---

## Part 2: What is Git and GitHub, really?

**Git** is a program that tracks changes to your files over time — like an
extremely detailed "undo history" that you control. A **repository** (repo)
is a folder that git is tracking.

**GitHub** is a website that stores a copy of your repo online. Two things
follow from that:
- Your code exists somewhere other than just your laptop (backup).
- GitHub can serve those files as a real website — that's **GitHub Pages**,
  and it's how your app becomes something you can open on your phone from
  anywhere, not just from files on one computer.

The core git commands you'll run, translated:

| Command | Plain English |
|---|---|
| `git init` | "Start tracking this folder." |
| `git add .` | "Include all my changed files in what I'm about to save." |
| `git commit -m "..."` | "Save a snapshot, labeled with this message." |
| `git push` | "Send my snapshots up to GitHub." |

If typing commands isn't appealing, VS Code's **Source Control** panel
(`Ctrl+Shift+G`) does the same things with buttons instead — stage, write a
message, commit, then click **Publish Branch**.

---

## Part 3: Supabase — the database and backend

### 3a. What is a database, actually?

A spreadsheet you can query with code instead of scrolling through. Your
app has four "sheets" (called **tables**):
- `workouts` — every planned run/session, plus what you actually did.
- `plan_meta` — your start date, rest days, goal time.
- `strava_tokens` — your Strava login credentials (kept locked away).
- `app_status` — small flags like "is Strava connected."

### 3b. Creating the project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name, set a database password (write it down somewhere — you
   likely won't need it day-to-day, but it's your master key if you ever
   need direct database access), choose a region near you.
3. Wait a minute or two while it provisions.

### 3c. Creating the tables (running a "migration")

A **migration** is just a file full of SQL — the language databases
understand — that says "create these tables with these columns." You don't
write SQL yourself; it's already written in `supabase/migrations/0001_init.sql`.

1. Supabase dashboard → **SQL Editor** (left sidebar).
2. Open `0001_init.sql` in VS Code, select all (`Ctrl+A`), copy.
3. Paste into the SQL Editor, click **Run**.

You've now created the four tables. You can see them under **Table Editor**
in the dashboard — genuinely worth a look, so "database" stops feeling
abstract.

### 3d. Creating your login (Supabase Auth)

**What "Auth" means here:** a system that checks a username/password and
tells the rest of the app "yes, this is really you" — so your training
data isn't visible to just anyone who finds the website's URL.

1. Dashboard → **Authentication → Users → Add user**.
2. Enter an email and password. This is *your* login for *your* app —
   there's no public sign-up page, because nobody else needs one.
3. Click into the user you just created and copy the **UID** (a long string
   like `a1b2c3d4-...`). This uniquely identifies "you" to the database.
   You'll paste this in two more places shortly.

### 3e. Locking the database to just you (Row Level Security)

**What this actually means:** by default, "logged in" could mean *anyone*
who creates an account — and Supabase allows public sign-ups unless you
turn that off. Even with sign-ups off, it's good practice to make the rule
explicit: "only the row-level security policy for *this specific user ID*
can read or write this data."

1. Open `supabase/migrations/0002_lock_to_owner.sql` in VS Code.
2. Find `OWNER_UID_HERE` (it appears a few times) and replace it with the
   UID you copied in 3d.
3. Copy the whole file, paste into SQL Editor, **Run**.
4. Dashboard → **Authentication → Providers → Email** → turn off
   **"Enable sign ups."** This closes the door so no one else can even
   create an account to test the policy against.

### 3f. Getting your API keys

Dashboard → **Project Settings → API**. Two values matter:
- **Project URL** — the address of your database (`https://xxxx.supabase.co`).
- **anon public key** — a long string. Despite "public" in the name feeling
  alarming, this key is *designed* to be visible in frontend code — it only
  grants whatever the Row Level Security policies (which you just set up)
  allow. It's not a secret in the same way the Strava client secret is.

### 3g. Installing the Supabase CLI

**What a CLI is:** "Command Line Interface" — a program you control by
typing commands instead of clicking. The Supabase CLI lets your terminal
talk directly to your Supabase project, for things the website dashboard
doesn't cover (like deploying Edge Functions).

```bash
npm install -g supabase
```
`npm` is Node.js's package installer — this downloads and installs the
`supabase` command globally on your computer.

```bash
supabase login
```
Opens a browser tab asking you to approve access — click approve, come back
to the terminal.

```bash
supabase link --project-ref YOUR-PROJECT-REF
```
Tells the CLI *which* Supabase project on your account you mean. Find
`YOUR-PROJECT-REF` in your Project URL — it's the part before `.supabase.co`.

---

## Part 4: Strava — registering your app

**What "registering an app" means:** Strava needs to know that some piece
of software is asking to read your data, so it can show you a permission
screen ("Allow this app to see your activities?") instead of just handing
data to anyone who asks.

1. [strava.com/settings/api](https://www.strava.com/settings/api) →
   fill in the form (name/website can be anything — this is just for you).
2. **Authorization Callback Domain**: this is the *domain* (not full URL)
   Strava is allowed to send you back to after you approve access. Use
   your future GitHub Pages domain, e.g. `yourname.github.io`.
3. Submit. You'll get a **Client ID** (not secret, identifies your app) and
   a **Client Secret** (this one's genuinely secret — it's what proves
   requests are really coming from your app, not an impersonator).

---

## Part 5: Secrets — teaching Supabase your credentials

**What a "secret" is in this context:** an environment variable stored by
Supabase, readable only by your Edge Functions when they run — never
visible in your code, your GitHub repo, or the browser.

```bash
supabase secrets set STRAVA_CLIENT_ID=xxxx
supabase secrets set STRAVA_CLIENT_SECRET=xxxx
supabase secrets set SUPABASE_ANON_KEY=your-anon-public-key
supabase secrets set OWNER_USER_ID=the-uid-from-3d
supabase secrets set ALLOWED_ORIGIN=https://yourname.github.io
```

Why `OWNER_USER_ID` again, if you already used it in the SQL file? The SQL
version restricts the *database*. This secret lets the *Edge Functions*
independently double-check "is the person calling me actually the owner?"
before doing anything — a second, separate lock on a different door.

`ALLOWED_ORIGIN` restricts which websites are allowed to even ask your
functions for anything (called **CORS** — Cross-Origin Resource Sharing).
Without it, in principle any website on the internet could send requests to
your function; setting this to your specific GitHub Pages URL closes that.

---

## Part 6: Edge Functions — the server-side code

**What an Edge Function is:** a small piece of code that runs on
Supabase's servers (not in your browser, not on your computer) whenever
your app asks it to. It's "serverless" in the sense that you don't manage
a server yourself — you just upload the code and Supabase runs it on
demand.

Your project has two:
- **`strava-callback`** — runs once, right after you approve access on
  Strava's site, to trade a one-time code for a lasting connection.
- **`strava-sync`** — runs whenever you tap "Sync" (or on a schedule, if
  you set that up later), to fetch your recent runs.

Deploy them:
```bash
supabase functions deploy strava-callback
supabase functions deploy strava-sync
```
This uploads the code in `supabase/functions/` to Supabase's servers. From
now on, those two functions exist and respond to requests — you don't need
to "start" them; they just run when called and sit idle otherwise (which is
also why the free tier comfortably covers this — you're only charged, so to
speak, in invocations, and you'll make maybe a dozen a day).

---

## Part 7: Connecting your frontend to your backend

Open `public/index.html`, find the `APP_CONFIG` block near the top, and
fill in the Supabase URL, anon key, and Strava Client ID from earlier parts.

**What this step does:** without it, the webpage has no idea which
Supabase project or Strava app it belongs to — these three values are the
"address book" connecting your specific webpage to your specific backend.

---

## Part 8: Publishing to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOU/YOUR-REPO.git
git push -u origin main
```

Line by line:
- `git init` — start tracking this folder with git.
- `git add .` — stage every file (the `.` means "everything here").
- `git commit -m "..."` — save a snapshot with a description.
- `git branch -M main` — name your primary branch "main" (GitHub's default
  expectation).
- `git remote add origin ...` — tell git "here's the GitHub repo this
  connects to" (you create this empty repo on github.com first, via the
  **+ → New repository** button).
- `git push -u origin main` — upload your snapshot to GitHub.

If commands aren't your thing, VS Code's Source Control panel does the
same via Stage → Commit → Publish Branch buttons.

---

## Part 9: GitHub Pages — turning the repo into a website

Repo → **Settings → Pages** → Source: "Deploy from a branch" → Branch:
`main`, Folder: `/public` → **Save**.

**What this does:** GitHub starts serving the contents of your `public`
folder as an actual website, at a URL like
`https://yourusername.github.io/your-repo/`. It rebuilds automatically
every time you push new changes — no separate "deploy" step needed for the
frontend (unlike the Edge Functions, which do need a manual redeploy after
changes).

---

## Part 10: Using it — what happens when you tap the buttons

1. **You open the site, sign in.** Your browser and Supabase Auth agree
   you're really you, and you get a session token (proof of identity for
   this browsing session).
2. **You tap Connect (Strava).** You're sent to Strava's own website with
   your Client ID attached. Strava shows *its* login/approval screen — you
   never enter your Strava password anywhere on your app, only on Strava's
   own site, which is exactly how it should be.
3. **You approve.** Strava sends you back to your app's URL with a
   temporary one-time code attached.
4. **Your app calls `strava-callback`**, handing it that code plus your
   session token (proving it's really you asking). The function checks
   your identity, then exchanges the code with Strava's servers for a
   lasting access token — using the Client Secret that only the function
   knows.
5. **That access token gets saved** in the `strava_tokens` table — which,
   remember, has no policies allowing the browser to read it directly. Only
   the Edge Functions can touch it.
6. **You tap Sync.** Your app calls `strava-sync` with your session token.
   The function checks your identity, uses the saved access token to ask
   Strava for your recent runs, and updates your `workouts` table with
   whatever matches by date.
7. **The page re-reads `workouts`** (which you *are* allowed to read
   directly, since it's your own data) and shows the updated distances,
   times, and paces.

---

## Glossary, for quick reference

| Term | Plain meaning |
|---|---|
| Repository (repo) | A folder git is tracking; also its copy on GitHub. |
| Commit | A saved snapshot of your files at a point in time. |
| Push / Pull | Send your commits to GitHub / fetch others' commits down. |
| API | A defined way for one program to ask another program for something. |
| API key / token | A password-like string proving who's asking. |
| OAuth | The standard "click to approve access" flow (what Strava uses). |
| Database | Structured, queryable storage — like a smart spreadsheet. |
| Table | One "sheet" within a database. |
| Row Level Security (RLS) | Rules controlling who can read/write which rows. |
| Edge Function | Small server-side code that runs on-demand, not 24/7. |
| Environment variable / secret | A hidden setting a program can read but users/visitors can't see. |
| CORS | Rules about which websites are allowed to call your function. |
| CLI | A program you control by typing commands. |

---

One last honest note: everything above deploys the *simpler* version of the
app's interface — the Dashboard, Start Run flow, and mobile polish you've
seen in the preview aren't in `public/index.html` yet. Ask any time and
I'll bring that version's code into the deployable project.

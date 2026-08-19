# Publishing to GitHub Without VS Code

You've got three options, from easiest (no tools at all) to most convenient
for future edits. Any of these gets you to the same place: a GitHub repo
that GitHub Pages can serve from.

---

## Option A — Upload straight from the GitHub website (easiest, no installs)

1. Go to [github.com](https://github.com) and log in (or create a free account).
2. Click the **+** in the top right → **New repository**.
3. Give it a name (e.g. `half-marathon-app`), leave it **Public** (GitHub
   Pages' free tier needs a public repo unless you're on a paid plan),
   don't check "Add a README" — leave it empty. Click **Create repository**.
4. On the new repo's page, click **uploading an existing file** (a link in
   the middle of the empty-repo screen).
5. On your computer, open the unzipped `strava-half-marathon-app` folder and
   drag the **entire folder's contents** (not the zip itself, and not the
   parent folder — the files and subfolders *inside* it) into the browser
   upload area. You should end up with `public/`, `supabase/`, `README.md`,
   etc. at the root of the repo.
6. Scroll down, click **Commit changes**.

That's it — your code is on GitHub. To make Pages serve it: **Settings →
Pages → Source: Deploy from a branch → Branch: `main`, Folder: `/public`
→ Save.**

**Downside of this method**: making future edits means repeating the
upload-and-drag process, or editing files directly in GitHub's web editor
(click any file → pencil icon → edit → commit). Fine for occasional tweaks,
clunkier for frequent changes.

---

## Option B — GitHub Desktop (a GUI app, no command line, no VS Code)

Better if you expect to keep editing this over time.

1. Download [GitHub Desktop](https://desktop.github.com) and install it.
2. Sign in with your GitHub account.
3. **File → Add Local Repository** → browse to your unzipped
   `strava-half-marathon-app` folder.
4. It will notice this folder isn't a git repo yet and offer to
   **create a repository** there — click that.
5. You'll see all the project files listed as changes. Type a commit summary
   (e.g. "Initial commit") in the bottom-left box, click **Commit to main**.
6. Click **Publish repository** in the top bar. Choose public/private, click
   **Publish**.

From then on, whenever you edit files (in any text editor — Notepad, TextEdit,
whatever), GitHub Desktop shows the changes; you commit and click **Push
origin** to update GitHub.

Enable Pages the same way as Option A: repo → **Settings → Pages**.

---

## Option C — Command line, but not VS Code's terminal

If you're fine with commands but just don't want to open VS Code: use
Terminal (Mac), or Command Prompt / PowerShell / Git Bash (Windows) instead.
The commands are identical to what VS Code's terminal would run — VS Code's
terminal is just a regular terminal running inside the editor window, so
there's nothing VS Code-specific about the commands themselves:

```bash
cd path/to/strava-half-marathon-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

You'll need [Git installed](https://git-scm.com) first, and a repo already
created empty on GitHub (Option A, steps 1–3) for the `remote add` URL to
point to.

---

## Which one should you pick?

- **Never touching this again after today** → Option A.
- **Might tweak the plan or styling later** → Option B (easiest ongoing workflow
  without learning git commands).
- **Already comfortable with a terminal, just skipping VS Code specifically**
  → Option C.

Whichever you choose, the Supabase CLI steps (creating secrets, deploying
the two Edge Functions) still need a terminal — that part doesn't have a
no-terminal alternative, since it's talking directly to Supabase's servers
rather than to GitHub. Any terminal works for that, same as Option C above.

# Audit: Free-Tier Feasibility, Issues Found, and Improvements

## Part 1 — Is this doable on free tiers?

**Short answer: yes**, with one caveat worth planning around.

| Service | What you need | Free tier | Verdict |
|---|---|---|---|
| **VS Code** | Editor | Free, unlimited | Fine |
| **GitHub** | Repo + Pages hosting | Pages is free for **public** repos | Fine — see note below |
| **Supabase** | Postgres + Auth + 2 Edge Functions | 500MB DB, generous function invocations | Far more than this app needs |
| **Strava API** | Personal API app | Free; rate-limited but generous for one user | Fine |

Your actual usage is tiny: ~65 workout rows, one user, a handful of syncs per day.

### The one real caveat: Supabase pauses inactive free projects

Free Supabase projects get paused after a period of inactivity (around a week). For a training app you might not open every day, this matters — you'd come back to a paused database and have to restore it from the dashboard.

**Mitigations:**
- Open the app every few days (realistic during training anyway).
- The scheduled auto-sync described in Part 3 also counts as activity, which sidesteps this neatly.
- Or upgrade to Supabase Pro if it becomes annoying.

### GitHub Pages requires a public repo (on free accounts)

Your code will be publicly visible. That's **fine here**, because:
- The Supabase anon key is *designed* to be public — Row Level Security is what protects data.
- Your Strava **client secret** lives in Supabase secrets, never in the repo.

But it means you must never paste a secret into `index.html`. Add a `.gitignore` (included now) and keep secrets in Supabase.

> These platform details are the kind of thing that changes. Confirm current limits at supabase.com/pricing and docs.github.com/pages rather than trusting this table blindly.

---

## Part 2 — Issues found (ordered by severity)

### 🔴 Critical: Edge Functions don't verify who's calling them

`strava-sync` and `strava-callback` use the **service role key** (which bypasses all RLS) but never check that the caller is actually you. Combined with a public repo containing your anon key, anyone who finds your repo could invoke your sync function.

**Fixed** in the updated `index.ts` files — they now validate the caller's JWT and confirm it matches your user ID before doing anything.

### 🔴 Critical: RLS allows *any* authenticated user, not just you

Every policy reads `auth.role() = 'authenticated'`. If public sign-ups are enabled on your Supabase project (they are by default), anyone could create an account and read/write your training data.

**Two things needed:**
1. **Fixed** in `0002_lock_to_owner.sql` — policies now check `auth.uid() = <your user id>`.
2. **You must also** disable public sign-ups: Supabase dashboard → Authentication → Providers → Email → turn off "Enable sign ups".

### 🟠 Moderate: CORS is wide open

`Access-Control-Allow-Origin: "*"` lets any website call your functions. Now configurable via an `ALLOWED_ORIGIN` secret.

### 🟠 Moderate: The deployed app is well behind the preview

The Supabase version of `public/index.html` is missing everything added since: Dashboard tab, Start Run flow, configurable rest days, goal pace, km/mi toggle, personal bests, pace trend, consistency heatmap, missed-run handling, and all the dark-theme mobile fixes.

**This is the biggest functional gap.** Porting it is straightforward but not a one-line change — say the word and I'll do it.

### 🟡 Minor: No `.gitignore`

Nothing stopped you from accidentally committing `.env`. **Fixed** — added one.

### 🟡 Minor: Sync matches only on date

If you run twice in one day, or log a workout on a rest day, matching gets confused. It also can't tell a 5km easy run from a 5km tempo run on the same date. Improved slightly (picks the closest distance match when there are several), but fundamentally date-based.

### 🟡 Minor: Elevation and heart rate aren't stored

The preview collects them; the database has no columns for them. **Fixed** in `0002`.

---

## Part 3 — Improvements worth making

### High value, easy

1. **Port the preview features into the deployed app** — biggest single win.
2. **Scheduled auto-sync** via `pg_cron` + `pg_net` (both available on Supabase free tier). Runs sync nightly so runs appear without you tapping anything — *and* keeps the project from going inactive. SQL included in `0003_auto_sync.sql.example`.
3. **Make it installable (PWA)** — add a manifest + icon so it lives on your home screen like a real app. No service worker needed unless you want offline.

### Medium value

4. **Strava webhooks instead of polling** — Strava can push new activities to your Edge Function the moment you finish a run. More setup (a verification endpoint), but it's the "proper" way and makes sync instant.
5. **Store the full Strava activity ID and link out to it** — one tap from a logged run to the actual Strava activity with map and splits.
6. **Better matching** — match on date *and* rough distance, and let you manually attach an activity to a workout when the guess is wrong.

### Lower priority

7. **Multiple race distances** (5K/10K/marathon) — needs new week-by-week templates written.
8. **Shoe/gear mileage tracking** — Strava exposes gear per activity.
9. **Export plan to `.ics`** so it shows in your normal calendar.

### Things I'd skip

- **True push notifications** — needs a push service (Firebase or similar), which breaks the "no additional services" constraint.
- **Adaptive AI coaching** — you already ruled this out, and rule-based adjustment (already in the preview via missed-run rescheduling) covers most of the practical value.

---

## What to do next, in order

1. Run `0002_lock_to_owner.sql` (after replacing the placeholder with your user ID).
2. Turn off public sign-ups in the Supabase dashboard.
3. Redeploy both Edge Functions so the auth checks take effect.
4. Set the `ALLOWED_ORIGIN` secret to your GitHub Pages URL.
5. Optionally run `0003_auto_sync.sql.example` for nightly sync.
6. Ask me to port the preview UI into `public/index.html`.

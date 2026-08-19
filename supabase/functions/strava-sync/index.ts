// supabase/functions/strava-sync/index.ts
//
// Pulls recent runs from Strava and matches them to planned workouts.
// Refreshes the access token when it's expired.
//
// Can be invoked two ways:
//   1. By the frontend (requires the owner's JWT).
//   2. By a scheduled pg_cron job (requires the CRON_SECRET header instead,
//      since a cron job has no user session).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, jsonResponse, requireOwner } from "../_shared/auth.ts";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

async function getValidAccessToken(supabase: any) {
  const { data, error } = await supabase.from("strava_tokens").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Not connected to Strava yet.");

  const now = Math.floor(Date.now() / 1000);
  if (data.expires_at > now + 60) return data.access_token;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: data.refresh_token,
    }),
  });
  const refreshed = await res.json();
  if (!res.ok) {
    console.error("Strava refresh failed:", refreshed);
    throw new Error("Could not refresh Strava token — try reconnecting.");
  }

  await supabase
    .from("strava_tokens")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      expires_at: refreshed.expires_at,
    })
    .eq("id", 1);

  return refreshed.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Allow either an owner session (from the app) or the cron secret (from
  // a scheduled job). Anything else is rejected.
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const isCron = CRON_SECRET.length > 0 && cronHeader === CRON_SECRET;
  if (!isCron) {
    const auth = await requireOwner(req);
    if (auth instanceof Response) return auth;
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const accessToken = await getValidAccessToken(supabase);

    const { data: meta } = await supabase
      .from("plan_meta").select("start_date").eq("id", 1).maybeSingle();
    const afterEpoch = meta
      ? Math.floor(new Date(meta.start_date).getTime() / 1000) - 86400
      : 0;

    const actRes = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${afterEpoch}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const activities = await actRes.json();
    if (!actRes.ok) {
      console.error("Strava activities fetch failed:", activities);
      throw new Error("Could not fetch activities from Strava.");
    }

    const runs = (activities as any[]).filter(
      (a) => a.type === "Run" || a.sport_type === "Run",
    );

    const { data: workouts, error: wErr } = await supabase.from("workouts").select("*");
    if (wErr) throw wErr;

    let synced = 0;
    const usedWorkoutIds = new Set<string>();

    for (const run of runs) {
      const runDate = run.start_date_local.slice(0, 10);
      const runKm = run.distance / 1000;

      // Candidates: same date, not already done, not already claimed by
      // another activity in this same sync pass.
      const candidates = (workouts ?? []).filter(
        (w: any) => w.date === runDate && !w.done && !usedWorkoutIds.has(w.id),
      );
      if (!candidates.length) continue;

      // If there are several, pick the one whose planned distance is closest —
      // handles double-run days better than blindly taking the first match.
      const match = candidates.reduce((best: any, w: any) => {
        const bestDiff = Math.abs((best.km ?? 0) - runKm);
        const thisDiff = Math.abs((w.km ?? 0) - runKm);
        return thisDiff < bestDiff ? w : best;
      });

      const { error: updErr } = await supabase
        .from("workouts")
        .update({
          done: true,
          strava_activity_id: run.id,
          strava_activity_url: `https://www.strava.com/activities/${run.id}`,
          actual_distance_km: Math.round(runKm * 100) / 100,
          actual_duration_sec: run.moving_time,
          elevation_m: run.total_elevation_gain ?? null,
          avg_hr: run.average_heartrate ?? null,
        })
        .eq("id", match.id);

      if (!updErr) {
        usedWorkoutIds.add(match.id);
        synced++;
      }
    }

    await supabase
      .from("app_status")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", 1);

    return jsonResponse({ ok: true, synced, totalRunsFound: runs.length });
  } catch (e) {
    console.error("strava-sync error:", e);
    return jsonResponse({ error: String(e?.message ?? "Sync failed.") }, 500);
  }
});

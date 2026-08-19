// supabase/functions/strava-callback/index.ts
//
// Completes the Strava OAuth handshake. The frontend calls this right after
// Strava redirects back with ?code=... — we exchange that code for tokens and
// store them server-side, where the browser can never read them.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, jsonResponse, requireOwner } from "../_shared/auth.ts";

const STRAVA_CLIENT_ID = Deno.env.get("STRAVA_CLIENT_ID")!;
const STRAVA_CLIENT_SECRET = Deno.env.get("STRAVA_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // Only the owner may connect a Strava account to this database.
  const auth = await requireOwner(req);
  if (auth instanceof Response) return auth;

  try {
    const { code } = await req.json();
    if (!code) return jsonResponse({ error: "Missing 'code'." }, 400);

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      // Don't echo Strava's raw payload back to the browser — it can contain
      // client identifiers. Log it server-side, return something generic.
      console.error("Strava token exchange failed:", tokenData);
      return jsonResponse({ error: "Strava rejected the authorization code." }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error: tokenErr } = await supabase.from("strava_tokens").upsert({
      id: 1,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: tokenData.expires_at,
      athlete_id: tokenData.athlete?.id ?? null,
    });
    if (tokenErr) throw tokenErr;

    const { error: statusErr } = await supabase
      .from("app_status")
      .update({ strava_connected: true })
      .eq("id", 1);
    if (statusErr) throw statusErr;

    return jsonResponse({ ok: true });
  } catch (e) {
    console.error("strava-callback error:", e);
    return jsonResponse({ error: "Could not complete Strava connection." }, 500);
  }
});

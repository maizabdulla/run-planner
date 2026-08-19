// supabase/functions/_shared/auth.ts
//
// Shared guards used by both Edge Functions.
//
// Why this exists: these functions hold the SERVICE ROLE key, which bypasses
// Row Level Security entirely. Without an explicit check, anyone who knows the
// function URL and the (public) anon key could invoke them. So we verify the
// caller's JWT and confirm it belongs to the owner.
//
// Everything below is wrapped in try/catch and reads secrets lazily (inside
// the function, not at module load time) so that a misconfigured secret
// produces a readable JSON error in the logs instead of a bare crash.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getAllowedOrigin(): string {
  return Deno.env.get("ALLOWED_ORIGIN") ?? "*";
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
// Kept for backwards compatibility with existing imports.
export const CORS = corsHeaders();

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json" },
  });
}

/**
 * Verifies the Authorization header carries a valid JWT for the owner.
 * Returns the user on success, or a Response to return immediately on failure.
 * Never throws — any unexpected error becomes a 500 JSON response with a
 * real message, so failures are visible in the Edge Function logs instead
 * of showing up as an opaque crash.
 */
export async function requireOwner(req: Request): Promise<{ userId: string } | Response> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("PROJECT_ANON_KEY");
    const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID") ?? "";

    if (!SUPABASE_URL) {
      return jsonResponse({ error: "Server misconfigured: SUPABASE_URL is not set (this is normally automatic)." }, 500);
    }
    if (!ANON_KEY) {
      return jsonResponse({ error: "Server misconfigured: PROJECT_ANON_KEY secret is not set. Run: supabase secrets set PROJECT_ANON_KEY=your-anon-key" }, 500);
    }
    if (!OWNER_USER_ID) {
      return jsonResponse({ error: "Server misconfigured: OWNER_USER_ID secret is not set. Run: supabase secrets set OWNER_USER_ID=your-user-uuid" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ error: "Missing Authorization header — are you signed in?" }, 401);

    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data, error } = await anon.auth.getUser(token);
    if (error) return jsonResponse({ error: "Invalid or expired session: " + error.message }, 401);
    if (!data?.user) return jsonResponse({ error: "Invalid or expired session: no user found for this token." }, 401);

    if (data.user.id !== OWNER_USER_ID) {
      return jsonResponse({ error: "Not authorized for this project." }, 403);
    }

    return { userId: data.user.id };
  } catch (e) {
    console.error("requireOwner crashed:", e);
    return jsonResponse({ error: "Auth check failed unexpectedly: " + String((e as any)?.message ?? e) }, 500);
  }
}
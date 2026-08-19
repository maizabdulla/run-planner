// supabase/functions/_shared/auth.ts
//
// Shared guards used by both Edge Functions.
//
// Why this exists: these functions hold the SERVICE ROLE key, which bypasses
// Row Level Security entirely. Without an explicit check, anyone who knows the
// function URL and the (public) anon key could invoke them. So we verify the
// caller's JWT and confirm it belongs to the owner.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
// Set this to your GitHub Pages origin, e.g. https://yourname.github.io
// Falls back to "*" only if unset, so local testing still works.
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
// Your auth user id. Set with:
//   supabase secrets set OWNER_USER_ID=xxxxxxxx-xxxx-...
const OWNER_USER_ID = Deno.env.get("OWNER_USER_ID") ?? "";

export const CORS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

/**
 * Verifies the Authorization header carries a valid JWT for the owner.
 * Returns the user on success, or a Response to return immediately on failure.
 */
export async function requireOwner(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return jsonResponse({ error: "Missing Authorization header." }, 401);

  // Validate the token by asking Supabase Auth who it belongs to.
  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return jsonResponse({ error: "Invalid or expired session." }, 401);

  if (!OWNER_USER_ID) {
    return jsonResponse(
      { error: "Server not configured: OWNER_USER_ID secret is not set." },
      500,
    );
  }
  if (data.user.id !== OWNER_USER_ID) {
    return jsonResponse({ error: "Not authorized." }, 403);
  }

  return { userId: data.user.id };
}

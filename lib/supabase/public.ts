import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./env";

/**
 * Stateless anon client for public reads.
 *
 * Requests carry the `anon` JWT, so Postgres Row Level Security decides what is
 * visible. In practice that means paid rows and public columns only.
 */
export function createPublicClient() {
  const { url, anonKey, configured } = readSupabaseEnv();
  if (!configured) {
    throw new Error("Supabase is not configured. Add credentials to .env.local.");
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "it3a-track-public" } },
  });
}

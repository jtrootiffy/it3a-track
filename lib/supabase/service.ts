import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv } from "./env";

/**
 * SERVICE ROLE. Bypasses Row Level Security.
 *
 * Only ever import this from server-only code: the login resolver and the
 * provisioning scripts. It is never referenced by a Client Component and the
 * key is never exposed through NEXT_PUBLIC_*.
 */
export function createServiceClient() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceClient() must not run in the browser.");
  }

  const { url, configured } = readSupabaseEnv();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!configured || serviceKey.length < 20) {
    throw new Error(
      "Missing Supabase service configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "X-Client-Info": "it3a-track-service" } },
  });
}

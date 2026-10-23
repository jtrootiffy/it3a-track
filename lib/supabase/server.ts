import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS, readSupabaseEnv } from "./env";

/**
 * Session-bound client for Server Components, Server Actions and Route
 * Handlers. Requests carry the signed-in user's JWT, so RLS runs as
 * `authenticated` and the admin policies apply.
 */
export async function createServerSupabase() {
  const { url, anonKey, configured } = readSupabaseEnv();
  if (!configured) {
    throw new Error("Supabase is not configured. Add credentials to .env.local.");
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called while rendering a Server Component: cookies are read-only
          // there. Middleware refreshes the session instead.
        }
      },
    },
  });
}

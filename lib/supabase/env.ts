export type SupabaseEnv = {
  url: string;
  anonKey: string;
  configured: boolean;
  /** Variables that are absent or still hold a placeholder value. */
  missing: string[];
};

/**
 * Cookie flags for the Supabase session.
 *
 * HttpOnly is safe here because there is no browser-side Supabase client: every
 * read and write goes through Server Components, Server Actions, or middleware.
 * Marking the cookie HttpOnly keeps an XSS bug from being able to read or
 * exfiltrate the session token. Both the middleware and the server client must
 * use these identical options.
 */
export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/**
 * Reads the public Supabase configuration.
 *
 * `configured` is false until real credentials are supplied, which lets every
 * page render a calm setup notice instead of crashing on a half-finished
 * deployment. The service-role key is deliberately NOT read here: it lives only
 * in the server-side provisioning scripts and `lib/supabase/service.ts`.
 */
export function readSupabaseEnv(): SupabaseEnv {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  const missing: string[] = [];

  if (!/^https?:\/\//.test(url) || url.includes("YOUR-PROJECT-REF")) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (anonKey.length <= 20 || anonKey.includes("YOUR-ANON-KEY")) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return { url, anonKey, configured: missing.length === 0, missing };
}

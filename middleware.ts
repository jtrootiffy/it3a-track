import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { AUTH_COOKIE_OPTIONS, readSupabaseEnv } from "@/lib/supabase/env";

/**
 * Session refresh + route protection.
 *
 * /admin is gated twice: here (cheap redirect before rendering) and again in
 * app/admin/layout.tsx (authoritative server-side check against it3a_admins).
 *
 * /login only bounces you to /admin if you are a confirmed administrator, so a
 * signed-in non-admin account can still reach the form and try another login.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, anonKey, configured } = readSupabaseEnv();
  if (!configured) return response;

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: AUTH_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Do not insert logic between createServerClient and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLoginRoute = pathname === "/login";

  if (!isAdminRoute && !isLoginRoute) return response;

  let isAdmin = false;
  if (user) {
    const { data: row } = await supabase
      .from("it3a_admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    isAdmin = Boolean(row);
  }

  if (isAdminRoute && !isAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (user) redirectUrl.searchParams.set("denied", "1");
    else redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (isLoginRoute && isAdmin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/login"],
};

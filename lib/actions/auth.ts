"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminProfile } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type LoginState = { error: string | null; identifier: string };

const GENERIC_ERROR = "Invalid username or password.";

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your username or email.")
    .max(160, "That identifier is too long."),
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(200, "That password is too long."),
});

/** Only allow same-origin, non-login destinations. Blocks open redirects. */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/")) return "/admin";
  if (value.startsWith("//")) return "/admin";
  if (value.startsWith("/login")) return "/admin";
  return value;
}

export async function loginAction(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const rawIdentifier =
    typeof formData.get("identifier") === "string"
      ? (formData.get("identifier") as string).trim().slice(0, 160)
      : "";

  const keep = (error: string): LoginState => ({ error, identifier: rawIdentifier });

  const parsed = loginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return keep(parsed.error.issues[0]?.message ?? "Enter your credentials.");
  }

  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    headerList.get("x-real-ip")?.trim() ||
    "local";

  const limit = checkRateLimit(`login:${ip}`);
  if (!limit.allowed) {
    return keep(`Too many attempts. Please wait ${limit.retryAfterSeconds} seconds and try again.`);
  }

  if (!readSupabaseEnv().configured) {
    return keep("This deployment is not connected to a database yet.");
  }

  const identifier = parsed.data.identifier.toLowerCase();

  // Resolve username -> email with the service role, server-side only. The
  // administrator's email address never reaches the browser.
  let email: string | null = null;

  try {
    const service = createServiceClient();

    const byUsername = await service
      .from("it3a_admins")
      .select("email")
      .eq("username", identifier)
      .maybeSingle();

    email = (byUsername.data?.email as string | undefined) ?? null;

    if (!email && identifier.includes("@")) {
      const byEmail = await service
        .from("it3a_admins")
        .select("email")
        .eq("email", identifier)
        .maybeSingle();

      email = (byEmail.data?.email as string | undefined) ?? null;
    }
  } catch {
    return keep("Sign in is temporarily unavailable. Please try again shortly.");
  }

  // Same message whether the username is unknown or the password is wrong.
  if (!email) return keep(GENERIC_ERROR);

  const supabase = await createServerSupabase();
  const { data: signIn, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  if (error || !signIn.user) return keep(GENERIC_ERROR);

  // A valid Supabase account is not enough. It must be one of the two admins.
  const admin = await getAdminProfile(supabase, signIn.user.id);
  if (!admin) {
    await supabase.auth.signOut();
    return keep("This account does not have administrator access.");
  }

  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  if (readSupabaseEnv().configured) {
    const supabase = await createServerSupabase();
    await supabase.auth.signOut();
  }
  redirect("/");
}

import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase/server";
import { readSupabaseEnv } from "./supabase/env";
import type { AdminProfile } from "./types";

type ServerClient = Awaited<ReturnType<typeof createServerSupabase>>;

export type SessionContext = {
  configured: boolean;
  supabase: ServerClient | null;
  user: User | null;
};

/** Never throws when the deployment is not configured yet. */
export async function getSessionUser(): Promise<SessionContext> {
  if (!readSupabaseEnv().configured) {
    return { configured: false, supabase: null, user: null };
  }

  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    return { configured: true, supabase, user: data.user ?? null };
  } catch {
    return { configured: false, supabase: null, user: null };
  }
}

/**
 * The single source of truth for "is this person an administrator".
 *
 * Reads it3a_admins through the user's own session, so RLS guarantees a user
 * can only ever see their own row. A signed-in account without a row here is
 * not an admin, no matter what the frontend claims.
 */
export async function getAdminProfile(
  supabase: ServerClient,
  userId: string,
): Promise<AdminProfile | null> {
  const { data } = await supabase
    .from("it3a_admins")
    .select("id, username, full_name")
    .eq("id", userId)
    .maybeSingle();

  return (data as AdminProfile | null) ?? null;
}

export type AdminContext =
  | { ok: true; supabase: ServerClient; user: User; admin: AdminProfile }
  | { ok: false; error: string };

/** Guard used by every mutation. Defence in depth on top of RLS. */
export async function requireAdmin(): Promise<AdminContext> {
  const { configured, supabase, user } = await getSessionUser();

  if (!configured) {
    return { ok: false, error: "This deployment is not connected to a database yet." };
  }
  if (!supabase || !user) {
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }

  const admin = await getAdminProfile(supabase, user.id);
  if (!admin) {
    return { ok: false, error: "This account does not have administrator access." };
  }

  return { ok: true, supabase, user, admin };
}

import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "@/lib/supabase/env";
import { supabaseNoStoreFetch } from "@/lib/supabase/fetch-no-store";

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(getSupabaseProjectUrl(url), serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: supabaseNoStoreFetch,
    },
  });
}

import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRole = "employee" | "admin";

export type UserProfile = {
  user_id: string;
  display_name: string;
  role: ProfileRole;
  is_active: boolean;
};

export function userMetadataDisplayName(user: User): string {
  return (
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.preferred_username as string | undefined) ??
    user.email ??
    "ゲスト"
  );
}

export function displayNameFromProfile(
  profile: Pick<UserProfile, "display_name"> | null | undefined,
  user?: User,
): string {
  const profileName = profile?.display_name?.trim();
  if (profileName) {
    return profileName;
  }
  return user ? userMetadataDisplayName(user) : "ゲスト";
}

export function isAdminProfile(profile: Pick<UserProfile, "role" | "is_active"> | null): boolean {
  return Boolean(profile?.is_active && profile.role === "admin");
}

export async function getOwnProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name, role, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as UserProfile;
}

export async function ensureOwnProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<UserProfile | null> {
  const existing = await getOwnProfile(supabase, user.id);
  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      display_name: userMetadataDisplayName(user),
      role: "employee",
    })
    .select("user_id, display_name, role, is_active")
    .single();

  if (error || !data) {
    return await getOwnProfile(supabase, user.id);
  }
  return data as UserProfile;
}

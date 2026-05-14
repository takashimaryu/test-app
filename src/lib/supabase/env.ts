/**
 * Supabase の「Project URL」は `https://xxxx.supabase.co` まで。
 * API の例で `.../rest/v1/` までコピーするとログインが壊れるので、ホストだけに揃える。
 */
export function getSupabaseProjectUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  try {
    const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol).origin;
  } catch {
    return trimmed.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
  }
}

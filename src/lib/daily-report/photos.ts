/** Supabase Storage: マイグレーション `20260216120000_daily_report_photos.sql` と一致 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const DAILY_REPORT_PHOTO_BUCKET = "daily_report_photos";

export const DAILY_REPORT_PHOTO_MAX_COUNT = 8;

export const DAILY_REPORT_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export const DAILY_REPORT_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp" as const;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function photoObjectPrefix(userId: string, workDate: string): string {
  return `${userId}/${workDate}`;
}

export function extFromImageMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

export function normalizePhotoPathsFromDb(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== "string") {
      continue;
    }
    const t = x.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    if (t.includes("..") || t.startsWith("/")) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function isPhotoPathUnderUserDay(userId: string, workDate: string, path: string): boolean {
  const prefix = `${photoObjectPrefix(userId, workDate)}/`;
  return path.startsWith(prefix) && !path.slice(prefix.length).includes("/");
}

export type DailyReportPhotoInitial = { path: string; signedUrl: string };

const SIGNED_URL_TTL_SEC = 60 * 60 * 12;

export async function signedDailyReportPhotoUrls(
  supabase: SupabaseClient,
  paths: string[],
): Promise<DailyReportPhotoInitial[]> {
  const out: DailyReportPhotoInitial[] = [];
  for (const path of paths) {
    const { data, error } = await supabase.storage
      .from(DAILY_REPORT_PHOTO_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SEC);
    if (!error && data?.signedUrl) {
      out.push({ path, signedUrl: data.signedUrl });
    }
  }
  return out;
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WORK_TYPE_SET } from "@/lib/attendance/work-types";
import {
  DAILY_REPORT_PHOTO_BUCKET,
  DAILY_REPORT_PHOTO_MAX_BYTES,
  DAILY_REPORT_PHOTO_MAX_COUNT,
  extFromImageMime,
  isPhotoPathUnderUserDay,
  normalizePhotoPathsFromDb,
  photoObjectPrefix,
} from "@/lib/daily-report/photos";
import { jstCalendarDateIso } from "@/lib/time/jst";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_TEXT = 4000;

function redirectReportErr(code: string): never {
  redirect(`/employee?rep=err&rc=${encodeURIComponent(code)}`);
}

function parseOptionalKm(raw: FormDataEntryValue | null): number | null | "bad" {
  if (typeof raw !== "string") {
    return null;
  }
  const t = raw.trim().replace(",", ".");
  if (t === "") {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 99_999) {
    return "bad";
  }
  return Math.round(n * 100) / 100;
}

function parseOptionalYen(raw: FormDataEntryValue | null): number | null | "bad" {
  if (typeof raw !== "string") {
    return null;
  }
  const t = raw.trim().replace(/,/g, "");
  if (t === "") {
    return null;
  }
  const n = parseInt(t, 10);
  if (Number.isNaN(n) || n < 0 || n > 99_999_999) {
    return "bad";
  }
  return n;
}

function parseWorkTypesFromForm(formData: FormData): string[] {
  const raw = formData.getAll("work_types");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== "string") {
      continue;
    }
    const t = v.trim();
    if (!t || !WORK_TYPE_SET.has(t) || seen.has(t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

function parseKeepPhotoPaths(formData: FormData, userId: string, workDate: string): string[] {
  const raw = formData.getAll("keep_photo");
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v !== "string") {
      continue;
    }
    const t = v.trim();
    if (!t || seen.has(t)) {
      continue;
    }
    if (!isPhotoPathUnderUserDay(userId, workDate, t)) {
      continue;
    }
    seen.add(t);
    out.push(t);
  }
  return out;
}

function parseNewPhotoFiles(formData: FormData): File[] {
  const raw = formData.getAll("photos");
  const out: File[] = [];
  for (const v of raw) {
    if (v instanceof File && v.size > 0) {
      out.push(v);
    }
  }
  return out;
}

export async function saveDailyReportAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const workTypes = parseWorkTypesFromForm(formData);

  const workOtherRaw = formData.get("work_other");
  const workOther =
    typeof workOtherRaw === "string" ? workOtherRaw.trim().slice(0, MAX_TEXT) : "";

  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" ? notesRaw.trim().slice(0, MAX_TEXT) : "";

  const km = parseOptionalKm(formData.get("distance_km"));
  if (km === "bad") {
    redirectReportErr("bad_distance");
  }
  const yen = parseOptionalYen(formData.get("toll_yen"));
  if (yen === "bad") {
    redirectReportErr("bad_toll");
  }

  const { data: existingRow } = await supabase
    .from("daily_report")
    .select("photo_paths")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  const dbPhotoPaths = normalizePhotoPathsFromDb(existingRow?.photo_paths);

  const keepRequested = parseKeepPhotoPaths(formData, user.id, workDate);
  const keptPaths = keepRequested.filter((p) => dbPhotoPaths.includes(p));
  const newFiles = parseNewPhotoFiles(formData);

  if (keptPaths.length + newFiles.length > DAILY_REPORT_PHOTO_MAX_COUNT) {
    redirectReportErr("too_many_photos");
  }

  for (const f of newFiles) {
    if (f.size > DAILY_REPORT_PHOTO_MAX_BYTES) {
      redirectReportErr("photo_too_large");
    }
    if (!extFromImageMime(f.type)) {
      redirectReportErr("bad_photo_type");
    }
  }

  const hasPhotos = keptPaths.length > 0 || newFiles.length > 0;
  const allEmpty =
    workTypes.length === 0 && notes === "" && km === null && yen === null && !hasPhotos;

  if (allEmpty) {
    if (dbPhotoPaths.length > 0) {
      await supabase.storage.from(DAILY_REPORT_PHOTO_BUCKET).remove(dbPhotoPaths);
    }
    const { error: delErr } = await supabase
      .from("daily_report")
      .delete()
      .eq("user_id", user.id)
      .eq("work_date", workDate);

    if (delErr) {
      redirectReportErr("db");
    }
  } else {
    const photoOnly =
      hasPhotos && notes === "" && km === null && yen === null && workTypes.length === 0;
    if (workTypes.length === 0 && !photoOnly) {
      redirectReportErr("work_type_required");
    }
    if (workTypes.includes("その他") && workOther === "") {
      redirectReportErr("bad_work_other");
    }

    const prefix = photoObjectPrefix(user.id, workDate);
    const uploadedPaths: string[] = [];

    try {
      for (const file of newFiles) {
        const ext = extFromImageMime(file.type)!;
        const objectPath = `${prefix}/${randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(DAILY_REPORT_PHOTO_BUCKET)
          .upload(objectPath, file, {
            contentType: file.type,
            upsert: false,
          });
        if (upErr) {
          throw new Error(upErr.message);
        }
        uploadedPaths.push(objectPath);
      }
    } catch {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DAILY_REPORT_PHOTO_BUCKET).remove(uploadedPaths);
      }
      redirectReportErr("db");
    }

    const finalPaths = [...keptPaths, ...uploadedPaths];
    const toRemove = dbPhotoPaths.filter((p) => !finalPaths.includes(p));
    if (toRemove.length > 0) {
      await supabase.storage.from(DAILY_REPORT_PHOTO_BUCKET).remove(toRemove);
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from("daily_report").upsert(
      {
        user_id: user.id,
        work_date: workDate,
        work_types: workTypes,
        work_other: workTypes.includes("その他") ? workOther : "",
        distance_km: km,
        toll_yen: yen,
        notes,
        photo_paths: finalPaths,
        updated_at: now,
      },
      { onConflict: "user_id,work_date" },
    );

    if (upErr) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(DAILY_REPORT_PHOTO_BUCKET).remove(uploadedPaths);
      }
      redirectReportErr("db");
    }
  }

  revalidatePath("/employee", "page");
  redirect("/employee?rep=1");
}

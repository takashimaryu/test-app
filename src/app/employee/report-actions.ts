"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { WORK_TYPE_SET } from "@/lib/attendance/work-types";
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

export async function saveDailyReportAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const workTypeRaw = formData.get("work_type");
  const workType = typeof workTypeRaw === "string" ? workTypeRaw.trim() : "";

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

  const allEmpty = workType === "" && notes === "" && km === null && yen === null;

  if (allEmpty) {
    const { error: delErr } = await supabase
      .from("daily_report")
      .delete()
      .eq("user_id", user.id)
      .eq("work_date", workDate);

    if (delErr) {
      redirectReportErr("db");
    }
  } else {
    if (workType === "" || !WORK_TYPE_SET.has(workType)) {
      redirectReportErr("work_type_required");
    }
    if (workType === "その他" && workOther === "") {
      redirectReportErr("bad_work_other");
    }

    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from("daily_report").upsert(
      {
        user_id: user.id,
        work_date: workDate,
        work_type: workType,
        work_other: workType === "その他" ? workOther : "",
        distance_km: km,
        toll_yen: yen,
        notes,
        updated_at: now,
      },
      { onConflict: "user_id,work_date" },
    );

    if (upErr) {
      redirectReportErr("db");
    }
  }

  revalidatePath("/employee", "page");
  redirect("/employee?rep=1");
}

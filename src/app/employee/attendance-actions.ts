"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jstCalendarDateIso, parseJstTimeHmOnWorkDate } from "@/lib/time/jst";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function redirectErr(code: string): never {
  redirect(`/employee?a=err&c=${encodeURIComponent(code)}`);
}

export async function clockInAction() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const { data: row, error: selErr } = await supabase
    .from("daily_attendance")
    .select("id, clock_in_at, clock_out_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (selErr) {
    redirectErr("db");
  }

  /** 退勤まで済みの行があるときの「出勤」= その日の記録をやり直して新しい出勤時刻にする */
  if (row?.clock_out_at) {
    const { error: delErr } = await supabase.from("daily_attendance").delete().eq("id", row.id);
    if (delErr) {
      redirectErr("db");
    }
  } else if (row && !row.clock_out_at) {
    redirectErr("already_in");
  }

  const clockInAt = new Date().toISOString();
  const { data: inserted, error: insErr } = await supabase
    .from("daily_attendance")
    .insert({
      user_id: user.id,
      work_date: workDate,
      clock_in_at: clockInAt,
    })
    .select("clock_in_at")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      redirectErr("already_in");
    }
    redirectErr("db");
  }

  const persistedIn = inserted?.clock_in_at as string | undefined;
  revalidatePath("/employee", "page");
  redirect(
    `/employee?a=in&ts=${encodeURIComponent(persistedIn ?? clockInAt)}`,
  );
}

export async function clockOutAction() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const { data: row, error: selErr } = await supabase
    .from("daily_attendance")
    .select("id, clock_out_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (selErr) {
    redirectErr("db");
  }
  if (!row) {
    redirectErr("not_in");
  }

  const clockOutAt = new Date().toISOString();
  const updatedAt = new Date().toISOString();

  /** 未退勤なら打刻（同時実行で二重退勤しない）、退勤済みなら退勤時刻を現時刻で上書き */
  let upd = supabase
    .from("daily_attendance")
    .update({
      clock_out_at: clockOutAt,
      updated_at: updatedAt,
    })
    .eq("id", row.id);
  if (!row.clock_out_at) {
    upd = upd.is("clock_out_at", null);
  }
  const { data: updated, error: updErr } = await upd.select("clock_out_at").single();

  if (updErr) {
    redirectErr("db");
  }

  const persistedOut = updated?.clock_out_at as string | undefined;
  revalidatePath("/employee", "page");
  redirect(
    `/employee?a=out&ts=${encodeURIComponent(persistedOut ?? clockOutAt)}`,
  );
}

/** 今日の行があれば削除（未退勤なら出勤のみ取り消し、退勤済みなら出退勤まとめて消す）。 */
export async function removeTodayAttendanceAction() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const { data: row, error: selErr } = await supabase
    .from("daily_attendance")
    .select("id, clock_out_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (selErr) {
    redirectErr("db");
  }
  if (!row) {
    redirectErr("cancel_no_in");
  }

  const hadClockOut = Boolean(row.clock_out_at);

  const { error: delErr } = await supabase.from("daily_attendance").delete().eq("id", row.id);

  if (delErr) {
    redirectErr("db");
  }

  revalidatePath("/employee", "page");
  if (hadClockOut) {
    redirect("/employee?a=clear_day");
  }
  redirect("/employee?a=undo_in");
}

/** 退勤済みのときだけ：退勤時刻を消して再び退勤できる状態に戻す。 */
export async function cancelClockOutAction() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const { data: row, error: selErr } = await supabase
    .from("daily_attendance")
    .select("id, clock_out_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (selErr) {
    redirectErr("db");
  }
  if (!row) {
    redirectErr("cancel_no_in");
  }
  if (!row.clock_out_at) {
    redirectErr("cancel_not_out");
  }

  const { error: updErr } = await supabase
    .from("daily_attendance")
    .update({
      clock_out_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updErr) {
    redirectErr("db");
  }

  revalidatePath("/employee", "page");
  redirect("/employee?a=undo_out");
}

/** 今日の行の出勤・退勤の「時刻だけ」（JST・当日の work_date）を上書きする。 */
export async function updateTodayAttendanceTimesAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const workDate = jstCalendarDateIso();
  const { data: row, error: selErr } = await supabase
    .from("daily_attendance")
    .select("id")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (selErr) {
    redirectErr("db");
  }
  if (!row) {
    redirectErr("edit_no_row");
  }

  const inRaw = formData.get("clock_in_time");
  const outRaw = formData.get("clock_out_time");
  if (typeof inRaw !== "string" || !inRaw.trim()) {
    redirectErr("bad_time");
  }

  const clockInAt = parseJstTimeHmOnWorkDate(workDate, inRaw.trim());
  if (!clockInAt) {
    redirectErr("bad_time");
  }

  let clockOutAt: string | null = null;
  if (typeof outRaw === "string" && outRaw.trim() !== "") {
    const parsed = parseJstTimeHmOnWorkDate(workDate, outRaw.trim());
    if (!parsed) {
      redirectErr("bad_time");
    }
    clockOutAt = parsed;
  }

  if (clockOutAt && new Date(clockOutAt) < new Date(clockInAt)) {
    redirectErr("time_order");
  }

  const { error: updErr } = await supabase
    .from("daily_attendance")
    .update({
      clock_in_at: clockInAt,
      clock_out_at: clockOutAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (updErr) {
    redirectErr("db");
  }

  revalidatePath("/employee", "page");
  redirect("/employee?a=edit");
}

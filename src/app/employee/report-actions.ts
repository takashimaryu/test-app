"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jstCalendarDateIso } from "@/lib/time/jst";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MAX_BODY = 8000;

function redirectReportErr(code: string): never {
  redirect(`/employee?rep=err&rc=${encodeURIComponent(code)}`);
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
  const raw = formData.get("body");
  const text = typeof raw === "string" ? raw.trim() : "";

  if (text === "") {
    const { error: delErr } = await supabase
      .from("daily_report")
      .delete()
      .eq("user_id", user.id)
      .eq("work_date", workDate);

    if (delErr) {
      redirectReportErr("db");
    }
  } else {
    const body = text.slice(0, MAX_BODY);
    const now = new Date().toISOString();
    const { error: upErr } = await supabase.from("daily_report").upsert(
      {
        user_id: user.id,
        work_date: workDate,
        body,
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

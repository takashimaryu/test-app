import Link from "next/link";
import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AttendancePanel } from "@/components/attendance-panel";
import { AttendanceRscRefresh } from "@/components/attendance-rsc-refresh";
import { SignOutButton } from "@/components/sign-out-button";
import { jstCalendarDateIso } from "@/lib/time/jst";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Search = { a?: string | string[]; c?: string | string[]; ts?: string | string[] };

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) {
    return undefined;
  }
  return typeof v === "string" ? v : v[0];
}

function parseStampedIso(q: Search): string | null {
  const raw = firstParam(q.ts);
  if (!raw || typeof raw !== "string") {
    return null;
  }
  let s = raw;
  try {
    s = decodeURIComponent(s);
  } catch {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}T/u.test(s)) {
    return null;
  }
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

function parseFlash(sp: Search) {
  const a = firstParam(sp.a);
  if (a === "in") {
    return { kind: "in" as const };
  }
  if (a === "out") {
    return { kind: "out" as const };
  }
  if (a === "undo_in") {
    return { kind: "undo_in" as const };
  }
  if (a === "undo_out") {
    return { kind: "undo_out" as const };
  }
  if (a === "clear_day") {
    return { kind: "clear_day" as const };
  }
  if (a === "edit") {
    return { kind: "edit" as const };
  }
  const c = firstParam(sp.c);
  if (a === "err" && c) {
    return { kind: "err" as const, code: c };
  }
  return null;
}

export const dynamic = "force-dynamic";

/**
 * ログイン後の「従業員マイページ」— 出退勤（JST 1 日 1往復）を記録。
 */
export default async function EmployeePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  noStore();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const q = await searchParams;
  const flash = parseFlash(q);
  const justStampedIso = parseStampedIso(q);

  const workDate = jstCalendarDateIso();
  const { data: todayRow, error: attErr } = await supabase
    .from("daily_attendance")
    .select("work_date, clock_in_at, clock_out_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  const displayName =
    (user.user_metadata?.name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.preferred_username as string | undefined) ??
    user.email ??
    "ゲスト";

  const today =
    attErr || !todayRow
      ? null
      : {
          work_date: todayRow.work_date as string,
          clock_in_at: todayRow.clock_in_at as string,
          clock_out_at: (todayRow.clock_out_at as string | null) ?? null,
        };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
        <header className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">マイページ</p>
          <h1 className="text-3xl font-semibold leading-tight">ようこそ</h1>
          <p className="text-lg text-neutral-800 dark:text-neutral-200">{displayName}</p>
        </header>

        {attErr ? (
          <p
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
            role="alert"
          >
            出退勤データを読めませんでした。Supabase の SQL Editor で{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              supabase/migrations/20260214120000_daily_attendance.sql
            </code>{" "}
            を実行し、テーブル <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">daily_attendance</code>{" "}
            を作成してください。
          </p>
        ) : null}

        <Suspense fallback={null}>
          <AttendanceRscRefresh />
        </Suspense>

        <AttendancePanel
          key={[
            today?.work_date,
            today?.clock_in_at,
            today?.clock_out_at ?? "",
            justStampedIso ?? "",
          ].join("|")}
          today={today}
          flash={flash}
          justStampedIso={justStampedIso}
        />

        <SignOutButton />

        <Link
          href="/"
          className="text-center text-sm text-neutral-500 underline underline-offset-4 dark:text-neutral-400"
        >
          トップへ戻る
        </Link>
      </main>
    </div>
  );
}

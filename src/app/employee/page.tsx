import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { AttendancePanel } from "@/components/attendance-panel";
import { DailyReportPanel, type DailyReportInitial } from "@/components/daily-report-panel";
import { SignOutButton } from "@/components/sign-out-button";
import { jstCalendarDateIso } from "@/lib/time/jst";
import { normalizeWorkTypesFromDb } from "@/lib/attendance/work-types";
import { reportSaveErrorMessage } from "@/lib/daily-report/report-save-errors";
import {
  normalizePhotoPathsFromDb,
  signedDailyReportPhotoUrls,
} from "@/lib/daily-report/photos";
import { displayNameFromProfile, ensureOwnProfile } from "@/lib/profiles";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Search = {
  a?: string | string[];
  c?: string | string[];
  ts?: string | string[];
  /** 打刻のエポック ms（`ts` の解釈に失敗しても表示を合わせる用） */
  ms?: string | string[];
  rep?: string | string[];
  rc?: string | string[];
};

function firstParam(v: string | string[] | undefined): string | undefined {
  if (v === undefined) {
    return undefined;
  }
  return typeof v === "string" ? v : v[0];
}

function parseStampedIso(q: Search): string | null {
  const rawMs = firstParam(q.ms);
  if (typeof rawMs === "string" && /^\d+$/.test(rawMs.trim())) {
    const n = Number(rawMs.trim());
    const d = new Date(n);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

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
  s = s.trim();
  if (/^\d{4}-\d{2}-\d{2} /.test(s)) {
    s = `${s.slice(0, 10)}T${s.slice(11)}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}T/u.test(s)) {
    return null;
  }
  const parsed = Date.parse(s);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
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

type ReportBanner = "ok" | { err: string } | null;

function parseReportBanner(q: Search): ReportBanner {
  const rep = firstParam(q.rep);
  if (rep === "1") {
    return "ok";
  }
  if (rep === "err") {
    const code = firstParam(q.rc) ?? "unknown";
    return { err: reportSaveErrorMessage(code) };
  }
  return null;
}

export const dynamic = "force-dynamic";

/**
 * ログイン後の「従業員マイページ」— 出退勤と今日の日報（JST 暦日）。
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

  const profile = await ensureOwnProfile(supabase, user);
  const q = await searchParams;
  const flash = parseFlash(q);
  const justStampedIso = parseStampedIso(q);
  const reportBanner = parseReportBanner(q);

  const workDate = jstCalendarDateIso();
  const { data: todayRow, error: attErr } = await supabase
    .from("daily_attendance")
    .select("work_date, clock_in_at, clock_out_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  const { data: reportRow, error: reportErr } = await supabase
    .from("daily_report")
    .select("id, work_types, work_other, distance_km, toll_yen, notes, photo_paths, submitted_at, updated_at")
    .eq("user_id", user.id)
    .eq("work_date", workDate)
    .maybeSingle();

  const displayName = displayNameFromProfile(profile, user);

  const today =
    attErr || !todayRow
      ? null
      : {
          work_date: todayRow.work_date as string,
          clock_in_at: todayRow.clock_in_at as string,
          clock_out_at: (todayRow.clock_out_at as string | null) ?? null,
        };

  const emptyReport: DailyReportInitial = {
    workTypes: [],
    workOther: "",
    distanceKm: "",
    tollYen: "",
    notes: "",
    photos: [],
    submittedAt: null,
  };

  const formatKmForInput = (v: unknown): string => {
    if (v === null || v === undefined) {
      return "";
    }
    if (typeof v === "number") {
      return String(v);
    }
    if (typeof v === "string") {
      return v;
    }
    return "";
  };

  const photoPathsKey = !reportErr
    ? normalizePhotoPathsFromDb(reportRow?.photo_paths)
        .slice()
        .sort()
        .join("|")
    : "";

  const reportInitial: DailyReportInitial = reportErr
    ? emptyReport
    : {
        workTypes: normalizeWorkTypesFromDb(reportRow?.work_types),
        workOther: (reportRow?.work_other as string) ?? "",
        distanceKm: formatKmForInput(reportRow?.distance_km),
        tollYen:
          reportRow?.toll_yen !== null && reportRow?.toll_yen !== undefined
            ? String(reportRow.toll_yen as number)
            : "",
        notes: (reportRow?.notes as string) ?? "",
        photos: await signedDailyReportPhotoUrls(
          supabase,
          normalizePhotoPathsFromDb(reportRow?.photo_paths),
        ),
        submittedAt: (reportRow?.submitted_at as string | null) ?? null,
      };

  const reportTypesKey = [...reportInitial.workTypes].sort().join(",");

  const reportPanelKey = reportErr
    ? "report-disabled"
    : `${reportRow?.id ?? "none"}-${reportTypesKey}-${photoPathsKey}-${(reportRow?.updated_at as string) ?? ""}`;

  const attendanceComplete = Boolean(today?.clock_out_at);
  const reportComplete =
    !reportErr && reportInitial.workTypes.length > 0 && reportInitial.photos.length > 0;
  const completedCount = Number(attendanceComplete) + Number(reportComplete);
  const progressPercent = `${completedCount * 50}%`;
  const statusTabs = [
    { href: "#attendance", label: "出退勤", complete: attendanceComplete },
    { href: "#daily-report", label: "日報", complete: reportComplete },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <header className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">マイページ</p>
          <h1 className="text-3xl font-semibold leading-tight">ようこそ</h1>
          <p className="text-lg text-neutral-800 dark:text-neutral-200">{displayName}</p>
        </header>

        <section
          aria-label="今日の進捗"
          className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                今日の進捗
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {completedCount}/2 完了
              </p>
            </div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {completedCount === 2 ? "完了" : "未完了"}
            </p>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-sky-600 transition-[width] dark:bg-sky-500"
              style={{ width: progressPercent }}
            />
          </div>

          <nav className="grid grid-cols-2 gap-2" aria-label="進捗タブ">
            {statusTabs.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className={`rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-colors ${
                  tab.complete
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200"
                }`}
              >
                <span className="block">{tab.label}</span>
                <span
                  className={`mt-0.5 block text-xs ${
                    tab.complete
                      ? "text-emerald-700 dark:text-emerald-200"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                >
                  {tab.complete ? "完了" : "未完了"}
                </span>
              </a>
            ))}
          </nav>
        </section>

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

        <div id="attendance">
          <AttendancePanel
            key={[
              flash?.kind ?? "",
              today?.work_date ?? "",
              today?.clock_in_at ?? "",
              today?.clock_out_at ?? "",
              justStampedIso ?? "",
              firstParam(q.ms) ?? "",
            ].join("|")}
            today={today}
            flash={flash}
            justStampedIso={justStampedIso}
          />
        </div>

        {reportBanner === "ok" ? (
          <p
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50"
            role="status"
          >
            日報を保存しました。
          </p>
        ) : null}
        {reportBanner && reportBanner !== "ok" ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50"
            role="alert"
          >
            {reportBanner.err}
          </p>
        ) : null}

        {reportErr ? (
          <p
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
            role="alert"
          >
            日報データを読めませんでした。Supabase の SQL Editor で{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              supabase/migrations/20260215120000_daily_report.sql
            </code>{" "}
            を実行してください。すでに旧版を入れている場合は続けて{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              supabase/migrations/20260215180000_daily_report_structured.sql
            </code>{" "}
            と{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              supabase/migrations/20260215200000_daily_report_work_type.sql
            </code>{" "}
            と{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              supabase/migrations/20260215210000_daily_report_work_types_array.sql
            </code>{" "}
            と{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              supabase/migrations/20260216120000_daily_report_photos.sql
            </code>{" "}
            も順に実行してください。
          </p>
        ) : null}

        <div id="daily-report">
          <DailyReportPanel
            key={reportPanelKey}
            initial={reportInitial}
            disabled={Boolean(reportErr)}
          />
        </div>

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

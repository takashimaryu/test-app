import {
  cancelClockOutAction,
  clockInAction,
  clockOutAction,
  removeTodayAttendanceAction,
} from "@/app/employee/attendance-actions";
import { AttendanceJstClock } from "@/components/attendance-jst-clock";
import { AttendanceTimesTapEdit } from "@/components/attendance-times-tap-edit";
import { jstCalendarDateIso } from "@/lib/time/jst";

export type TodayAttendance = {
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
} | null;

type Flash =
  | { kind: "in" }
  | { kind: "out" }
  | { kind: "edit" }
  | { kind: "undo_in" }
  | { kind: "undo_out" }
  | { kind: "clear_day" }
  | { kind: "err"; code: string }
  | null;

const errCopy: Record<string, string> = {
  already_in: "すでに今日は出勤済みです。退勤してから再度お試しください。",
  not_in: "今日の出勤記録がありません。先に出勤してください。",
  db: "データの保存に失敗しました。Supabase で SQL（daily_attendance）を実行したか確認してください。",
  cancel_no_in: "取り消せる出勤記録がありません。",
  cancel_not_out: "まだ退勤していないため、退勤の取り消しはできません。",
  bad_time: "日時の形式が正しくありません。",
  time_order: "退勤は出勤より後の時刻にしてください。",
  edit_no_row: "修正できる今日の記録がありません。",
};

function flashText(f: Flash): string | null {
  if (!f) {
    return null;
  }
  if (f.kind === "in") {
    return "出勤を記録しました。";
  }
  if (f.kind === "out") {
    return "退勤を記録しました。";
  }
  if (f.kind === "edit") {
    return "出退勤の時刻を更新しました。";
  }
  if (f.kind === "undo_in") {
    return "出勤を取り消しました。";
  }
  if (f.kind === "undo_out") {
    return "退勤を取り消しました。もう一度退勤できます。";
  }
  if (f.kind === "clear_day") {
    return "今日の出退勤をまとめて取り消しました。";
  }
  return errCopy[f.code] ?? `処理できませんでした（${f.code}）。`;
}

function applyJustStamped(
  today: TodayAttendance,
  flash: Flash,
  justIso: string | null,
): TodayAttendance {
  if (!justIso || !flash) {
    return today;
  }
  if (flash.kind === "in") {
    if (!today) {
      return {
        work_date: jstCalendarDateIso(),
        clock_in_at: justIso,
        clock_out_at: null,
      };
    }
    return {
      ...today,
      clock_in_at: justIso,
    };
  }
  if (flash.kind === "out") {
    if (!today) {
      return today;
    }
    return {
      ...today,
      clock_out_at: justIso,
    };
  }
  return today;
}

export function AttendancePanel({
  today,
  flash,
  justStampedIso,
}: {
  today: TodayAttendance;
  flash: Flash;
  justStampedIso: string | null;
}) {
  const msg = flashText(flash);
  /** 行削除直後に RSC が古い today を返すことがあるので、成功フラッシュでは表示だけ空に合わせる */
  const cleared = flash?.kind === "undo_in" || flash?.kind === "clear_day";
  const stamped =
    !cleared && justStampedIso && (flash?.kind === "in" || flash?.kind === "out")
      ? applyJustStamped(today, flash, justStampedIso)
      : today;
  const showRow = cleared ? null : stamped;
  const isWorking = Boolean(showRow && !showRow.clock_out_at);

  const inOn =
    "flex min-h-14 w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 text-lg font-semibold text-white shadow-sm active:scale-[0.99] dark:bg-white dark:text-neutral-950";
  const outOn =
    "flex min-h-14 w-full items-center justify-center rounded-2xl border border-neutral-300 bg-white px-4 text-lg font-semibold text-neutral-900 shadow-sm active:scale-[0.99] dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50";
  const outOff =
    "flex min-h-14 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-100 px-4 text-lg font-semibold text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-500";

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
          今日の出退勤
        </h2>
        <AttendanceJstClock />
      </div>

      {msg ? (
        <p
          className={`rounded-xl px-3 py-2 text-sm ${
            flash?.kind === "err"
              ? "border border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50"
              : "border border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50"
          }`}
          role="status"
        >
          {msg}
        </p>
      ) : null}

      {showRow ? (
        <AttendanceTimesTapEdit
          clockInAt={showRow.clock_in_at}
          clockOutAt={showRow.clock_out_at}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 text-neutral-950 dark:text-neutral-50 sm:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">出勤</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-wide text-neutral-400 dark:text-neutral-500">
              —
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">退勤</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-wide text-neutral-400 dark:text-neutral-500">
              —
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-row gap-3">
        {!showRow ? (
          <>
            <form action={clockInAction} className="flex-1">
              <button type="submit" className={inOn}>
                出勤
              </button>
            </form>
            <div className="flex-1">
              <button type="button" disabled className={outOff}>
                退勤
              </button>
            </div>
          </>
        ) : isWorking ? (
          <>
            <form action={removeTodayAttendanceAction} className="flex-1">
              <button type="submit" className={inOn}>
                出勤
              </button>
            </form>
            <form action={clockOutAction} className="flex-1">
              <button type="submit" className={outOn}>
                退勤
              </button>
            </form>
          </>
        ) : (
          <>
            <form action={removeTodayAttendanceAction} className="flex-1">
              <button type="submit" className={inOn}>
                出勤
              </button>
            </form>
            <div className="flex flex-1 flex-col gap-2">
              <form action={clockOutAction} className="w-full">
                <button type="submit" className={`${outOn} w-full`}>
                  退勤
                </button>
              </form>
              <form action={cancelClockOutAction} className="w-full">
                <button
                  type="submit"
                  className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-600 dark:border-neutral-600 dark:text-neutral-400"
                >
                  退勤のみ取り消す
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

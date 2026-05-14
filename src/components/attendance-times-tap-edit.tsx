"use client";

import { useCallback, useEffect, useState } from "react";
import { updateTodayAttendanceTimesAction } from "@/app/employee/attendance-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";
import { isoToJstTimeHm } from "@/lib/time/jst";

/** 打刻の「いま」との差が分からないよう、秒まで出す（分単位だけだと同一分の再打刻が同じ表示になる） */
function formatJstTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

const timeTap =
  "mt-1 w-full rounded-xl border border-transparent px-2 py-1.5 text-left text-2xl font-semibold tabular-nums tracking-wide text-neutral-950 outline-none ring-offset-2 transition-colors hover:border-neutral-200 hover:bg-white/90 focus-visible:border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-50 dark:hover:border-neutral-600 dark:hover:bg-neutral-900/80 dark:focus-visible:border-neutral-500 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-900";

export function AttendanceTimesTapEdit({
  clockInAt,
  clockOutAt,
}: {
  clockInAt: string;
  clockOutAt: string | null;
}) {
  const [editing, setEditing] = useState(false);

  const openEdit = useCallback(() => setEditing(true), []);
  const closeEdit = useCallback(() => setEditing(false), []);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  if (editing) {
    return (
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-600 dark:bg-neutral-950">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          当日分は日付を固定し、日本時間の時刻だけ変えられます。退勤を空にすると未退勤に戻ります。Esc
          で閉じます。
        </p>
        <form action={updateTodayAttendanceTimesAction} className="space-y-3">
          <div>
            <label
              htmlFor="att-clock-in"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              出勤
            </label>
            <input
              id="att-clock-in"
              name="clock_in_time"
              type="time"
              required
              step={60}
              defaultValue={isoToJstTimeHm(clockInAt)}
              className="w-full max-w-[12rem] rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div>
            <label
              htmlFor="att-clock-out"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400"
            >
              退勤
            </label>
            <input
              id="att-clock-out"
              name="clock_out_time"
              type="time"
              step={60}
              defaultValue={clockOutAt ? isoToJstTimeHm(clockOutAt) : ""}
              className="w-full max-w-[12rem] rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <FormPendingSubmit
              className="flex-1 rounded-xl border border-neutral-300 bg-neutral-900 py-2.5 text-sm font-semibold text-white shadow-sm active:scale-[0.99] dark:border-neutral-600 dark:bg-white dark:text-neutral-950"
              label="保存"
            />
            <button
              type="button"
              onClick={closeEdit}
              className="flex-1 rounded-xl border border-neutral-300 bg-white py-2.5 text-sm font-semibold text-neutral-900 active:scale-[0.99] dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 text-neutral-950 dark:text-neutral-50 sm:gap-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">出勤</p>
          <button
            type="button"
            className={timeTap}
            onClick={openEdit}
            aria-label="出勤時刻を変更"
          >
            {formatJstTime(clockInAt)}
          </button>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">退勤</p>
          <button
            type="button"
            className={`${timeTap} ${!clockOutAt ? "text-neutral-400 dark:text-neutral-500" : ""}`}
            onClick={openEdit}
            aria-label="退勤時刻を変更"
          >
            {clockOutAt ? formatJstTime(clockOutAt) : "—"}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
        時刻をタップして変更
      </p>
    </div>
  );
}

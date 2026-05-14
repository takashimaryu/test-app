"use client";

import { useEffect, useState } from "react";
import { saveDailyReportAction } from "@/app/employee/report-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";
import {
  WORK_MAIN_THREE,
  WORK_OTHER_GROUP,
  splitWorkTypesUiState,
} from "@/lib/attendance/work-types";

export type DailyReportInitial = {
  workTypes: string[];
  workOther: string;
  distanceKm: string;
  tollYen: string;
  notes: string;
};

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none ring-offset-2 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-500 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-900";

const legendClass = "mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

const btnBase =
  "min-h-12 rounded-xl border px-2 py-2.5 text-sm font-semibold transition-[color,background-color,border-color,box-shadow] disabled:opacity-60 sm:px-3";
const btnOff =
  "border-neutral-200 bg-white text-neutral-800 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:border-neutral-500 dark:hover:bg-neutral-900";
const btnOn =
  "border-sky-600 bg-sky-600 text-white shadow-md ring-2 ring-sky-600/30 ring-offset-2 ring-offset-neutral-50 dark:border-sky-500 dark:bg-sky-600 dark:ring-sky-400/35 dark:ring-offset-neutral-900";

export function DailyReportPanel({
  initial,
  disabled,
}: {
  initial: DailyReportInitial;
  disabled?: boolean;
}) {
  const { main: initialMain, otherSelect: initialOther } = splitWorkTypesUiState(initial.workTypes);
  const [mainPicked, setMainPicked] = useState(() => initialMain);
  const [otherPick, setOtherPick] = useState(initialOther);
  const [otherText, setOtherText] = useState(initial.workOther);

  const showOther = otherPick === "その他";

  useEffect(() => {
    if (!showOther) {
      setOtherText("");
    }
  }, [showOther]);

  const toggleMain = (opt: string) => {
    setMainPicked((prev) => {
      const n = new Set(prev);
      if (n.has(opt)) {
        n.delete(opt);
      } else {
        n.add(opt);
      }
      return n;
    });
  };

  const clearAll = () => {
    setMainPicked(new Set());
    setOtherPick("");
    setOtherText("");
  };

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          「取り消し」で作業内容をすべて外し、距離・料金・連絡もすべて空のまま保存すると、この日の日報を削除します。
        </p>
      </div>
      <form action={saveDailyReportAction} className="space-y-4">
        {[...mainPicked].map((v) => (
          <input key={v} type="hidden" name="work_types" value={v} />
        ))}
        {otherPick ? <input type="hidden" name="work_types" value={otherPick} /> : null}

        <fieldset className="min-w-0 space-y-3 border-0 p-0">
          <legend className={legendClass}>作業内容（複数選択可）</legend>

          <div className="grid grid-cols-3 gap-2">
            {WORK_MAIN_THREE.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                aria-pressed={mainPicked.has(opt)}
                onClick={() => toggleMain(opt)}
                className={`${btnBase} ${mainPicked.has(opt) ? btnOn : btnOff}`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rep-other-dd" className={legendClass}>
              その他
            </label>
            <select
              id="rep-other-dd"
              disabled={disabled}
              value={otherPick}
              onChange={(e) => setOtherPick(e.target.value)}
              className={field}
            >
              <option value="">選択してください</option>
              {WORK_OTHER_GROUP.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "その他" ? "その他（自由入力）" : opt}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            <button
              type="button"
              disabled={disabled}
              className="font-medium text-neutral-800 underline underline-offset-2 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
              onClick={clearAll}
            >
              取り消し
            </button>
            <span className="ml-2">（作業内容の選択をすべて外す）</span>
          </p>
        </fieldset>

        <div className={showOther ? "space-y-1.5" : "hidden"}>
          <label htmlFor="rep-work-other" className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            その他の内容
          </label>
          <textarea
            id="rep-work-other"
            name="work_other"
            rows={3}
            disabled={disabled || !showOther}
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            maxLength={4000}
            placeholder="作業の具体的な内容"
            className={`${field} resize-y`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rep-km" className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              移動距離（km）
            </label>
            <input
              id="rep-km"
              name="distance_km"
              type="text"
              inputMode="decimal"
              disabled={disabled}
              defaultValue={initial.distanceKm}
              placeholder="例: 42.5"
              autoComplete="off"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="rep-toll" className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              高速料金（円）
            </label>
            <input
              id="rep-toll"
              name="toll_yen"
              type="text"
              inputMode="numeric"
              disabled={disabled}
              defaultValue={initial.tollYen}
              placeholder="例: 1200"
              autoComplete="off"
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="rep-notes" className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            連絡事項（自由入力）
          </label>
          <textarea
            id="rep-notes"
            name="notes"
            rows={3}
            disabled={disabled}
            defaultValue={initial.notes}
            maxLength={4000}
            placeholder="連絡・依頼・特記事項など"
            className={`${field} resize-y`}
          />
        </div>

        <FormPendingSubmit
          className="w-full rounded-2xl border border-neutral-300 bg-neutral-900 px-4 py-3 text-sm font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60 dark:border-neutral-600 dark:bg-white dark:text-neutral-950"
          label="日報を保存"
          pendingLabel="保存中…"
          disabled={disabled}
        />
      </form>
    </section>
  );
}

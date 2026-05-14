"use client";

import { useMemo, useState } from "react";
import { saveDailyReportAction } from "@/app/employee/report-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";
import { WORK_MAIN_THREE, WORK_OTHER_DROPDOWN } from "@/lib/attendance/work-types";

export type DailyReportInitial = {
  workType: string;
  workOther: string;
  distanceKm: string;
  tollYen: string;
  notes: string;
};

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none ring-offset-2 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-500 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-900";

const legendClass = "mb-2 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

const btnBase =
  "min-h-11 flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-60";
const btnOff =
  "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:hover:border-neutral-500";
const btnOn =
  "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-950";

export function DailyReportPanel({
  initial,
  disabled,
}: {
  initial: DailyReportInitial;
  disabled?: boolean;
}) {
  const [workType, setWorkType] = useState(initial.workType);

  const selectValue = useMemo(() => {
    return (WORK_OTHER_DROPDOWN as readonly string[]).includes(workType) ? workType : "";
  }, [workType]);

  const showOther = workType === "その他";

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          作業内容が「記録しない」で、距離・料金・連絡もすべて空のまま保存すると、この日の日報を削除します。
        </p>
      </div>
      <form action={saveDailyReportAction} className="space-y-4">
        <input type="hidden" name="work_type" value={workType} />

        <fieldset className="min-w-0 space-y-3 border-0 p-0">
          <legend className={legendClass}>作業内容</legend>

          <div className="flex flex-wrap gap-2">
            {WORK_MAIN_THREE.map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => setWorkType(opt)}
                className={`${btnBase} ${workType === opt ? btnOn : btnOff}`}
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rep-other-select" className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              その他
            </label>
            <select
              id="rep-other-select"
              disabled={disabled}
              value={selectValue}
              onChange={(e) => {
                const v = e.target.value;
                setWorkType(v === "" ? "" : v);
              }}
              className={field}
            >
              <option value="">選択してください</option>
              {WORK_OTHER_DROPDOWN.map((opt) => (
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
              className="underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
              onClick={() => setWorkType("")}
            >
              記録しない
            </button>
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
            defaultValue={initial.workOther}
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

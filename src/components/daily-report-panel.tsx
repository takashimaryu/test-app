"use client";

import { useState } from "react";
import { saveDailyReportAction } from "@/app/employee/report-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";
import { WORK_TYPE_CHOICES } from "@/lib/attendance/work-types";

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

function RadioChoice({
  value,
  label,
  defaultChecked,
  disabled,
}: {
  value: string;
  label: string;
  defaultChecked: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block cursor-pointer rounded-xl has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-400 dark:has-[:focus-visible]:ring-neutral-500">
      <input
        type="radio"
        name="work_type"
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="peer sr-only"
      />
      <span className="flex min-h-10 items-center rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:peer-checked:border-white dark:peer-checked:bg-white dark:peer-checked:text-neutral-950">
        {label}
      </span>
    </label>
  );
}

export function DailyReportPanel({
  initial,
  disabled,
}: {
  initial: DailyReportInitial;
  disabled?: boolean;
}) {
  const [showOther, setShowOther] = useState(initial.workType === "その他");

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          作業内容で「記録しない」を選び、距離・料金・連絡もすべて空にして保存すると、この日の日報を削除します。
        </p>
      </div>
      <form
        action={saveDailyReportAction}
        className="space-y-4"
        onChange={(e) => {
          const t = e.target as HTMLElement;
          if (t instanceof HTMLInputElement && t.name === "work_type") {
            setShowOther(t.value === "その他");
          }
        }}
      >
        <fieldset className="min-w-0 space-y-2 border-0 p-0">
          <legend className={legendClass}>作業内容（タップで選択）</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <RadioChoice
              value=""
              label="記録しない"
              defaultChecked={initial.workType === ""}
              disabled={disabled}
            />
            {WORK_TYPE_CHOICES.map((opt) => (
              <RadioChoice
                key={opt}
                value={opt}
                label={opt}
                defaultChecked={initial.workType === opt}
                disabled={disabled}
              />
            ))}
          </div>
        </fieldset>

        <div className={showOther ? "space-y-1.5" : "hidden"}>
          <label htmlFor="rep-work-other" className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            その他（内容を入力）
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

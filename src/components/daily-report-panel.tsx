"use client";

import { useEffect, useState } from "react";
import { saveDailyReportAction } from "@/app/employee/report-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";
import { WORK_MAIN_THREE, WORK_OTHER_GROUP } from "@/lib/attendance/work-types";

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

const checkLabel =
  "flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:has-[:focus-visible]:ring-neutral-500";

function WorkCheck({
  value,
  label,
  checked,
  disabled,
  onToggle,
}: {
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (v: string) => void;
}) {
  return (
    <label className={checkLabel}>
      <input
        type="checkbox"
        name="work_types"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(value)}
        className="size-4 shrink-0 rounded border-neutral-300 accent-neutral-900 dark:accent-white"
      />
      <span>{label}</span>
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
  const [picked, setPicked] = useState(() => new Set(initial.workTypes));
  const [otherText, setOtherText] = useState(initial.workOther);

  const hasSonota = picked.has("その他");

  useEffect(() => {
    if (!hasSonota) {
      setOtherText("");
    }
  }, [hasSonota]);

  const toggle = (v: string) => {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(v)) {
        n.delete(v);
      } else {
        n.add(v);
      }
      return n;
    });
  };

  const clearAll = () => {
    setPicked(new Set());
    setOtherText("");
  };

  const showOther = picked.has("その他");

  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          「取り消し」で作業内容のチェックをすべて外し、距離・料金・連絡もすべて空のまま保存すると、この日の日報を削除します。
        </p>
      </div>
      <form action={saveDailyReportAction} className="space-y-4">
        <fieldset className="min-w-0 space-y-3 border-0 p-0">
          <legend className={legendClass}>作業内容（複数選択可）</legend>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WORK_MAIN_THREE.map((opt) => (
              <WorkCheck
                key={opt}
                value={opt}
                label={opt}
                checked={picked.has(opt)}
                disabled={disabled}
                onToggle={toggle}
              />
            ))}
          </div>

          <p className={legendClass}>その他</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {WORK_OTHER_GROUP.map((opt) => (
              <WorkCheck
                key={opt}
                value={opt}
                label={opt === "その他" ? "その他（自由入力）" : opt}
                checked={picked.has(opt)}
                disabled={disabled}
                onToggle={toggle}
              />
            ))}
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

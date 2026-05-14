import { saveDailyReportAction } from "@/app/employee/report-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";

export type DailyReportInitial = {
  workContent: string;
  distanceKm: string;
  tollYen: string;
  notes: string;
};

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none ring-offset-2 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-500 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-900";

const label = "mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400";

export function DailyReportPanel({
  initial,
  disabled,
}: {
  initial: DailyReportInitial;
  disabled?: boolean;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          日本時間の「今日」に紐づきます。すべて空のまま保存すると日報を削除します。
        </p>
      </div>
      <form action={saveDailyReportAction} className="space-y-4">
        <div>
          <label htmlFor="rep-work" className={label}>
            作業内容
          </label>
          <textarea
            id="rep-work"
            name="work_content"
            rows={5}
            disabled={disabled}
            defaultValue={initial.workContent}
            maxLength={4000}
            placeholder="今日の作業内容"
            className={`${field} resize-y`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="rep-km" className={label}>
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
            <label htmlFor="rep-toll" className={label}>
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
          <label htmlFor="rep-notes" className={label}>
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

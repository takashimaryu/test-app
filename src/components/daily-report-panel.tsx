import { saveDailyReportAction } from "@/app/employee/report-actions";
import { FormPendingSubmit } from "@/components/form-pending-submit";

export function DailyReportPanel({
  initialBody,
  disabled,
}: {
  initialBody: string;
  /** テーブル未作成などで保存できないとき */
  disabled?: boolean;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          日本時間の「今日」に紐づきます。空のまま保存すると日報を消します（最大 {8000} 文字）。
        </p>
      </div>
      <form action={saveDailyReportAction} className="space-y-3">
        <textarea
          name="body"
          rows={8}
          disabled={disabled}
          defaultValue={initialBody}
          maxLength={8000}
          placeholder="今日の作業内容・連絡事項など"
          className="w-full resize-y rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none ring-offset-2 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-500 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-900"
        />
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

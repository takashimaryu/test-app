"use client";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { saveDailyReportAction } from "@/app/employee/report-actions";
import {
  DAILY_REPORT_PHOTO_ACCEPT,
  DAILY_REPORT_PHOTO_MAX_BYTES,
  DAILY_REPORT_PHOTO_MAX_COUNT,
  type DailyReportPhotoInitial,
} from "@/lib/daily-report/photos";
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
  photos: DailyReportPhotoInitial[];
};

const field =
  "w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 outline-none ring-offset-2 placeholder:text-neutral-400 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-neutral-500 dark:focus-visible:ring-neutral-500 dark:ring-offset-neutral-900";

const legendClass = "mb-2 block text-sm font-medium text-neutral-600 dark:text-neutral-400";

const btnBase =
  "min-h-[3rem] rounded-xl border px-1.5 py-2.5 text-base font-semibold transition-[color,background-color,border-color,box-shadow] disabled:opacity-60 sm:px-2";
const btnOff =
  "border-neutral-200 bg-white text-neutral-800 shadow-sm active:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:active:bg-neutral-900";
const btnOn =
  "border-sky-600 bg-sky-600 text-white shadow-md ring-1 ring-sky-400/50 dark:border-sky-500 dark:bg-sky-600 dark:ring-sky-300/40";

const toggleBtn =
  "shrink-0 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm active:scale-[0.99] dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50";

const ALLOWED_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);

type PendingPhoto = { id: string; file: File; url: string };

function collapsedSummaryLine(initial: DailyReportInitial, pendingPhotoCount: number): string {
  const bits: string[] = [];
  if (initial.workTypes.length) {
    bits.push(`作業${initial.workTypes.length}種`);
  }
  if (initial.photos.length) {
    bits.push(`写真${initial.photos.length}枚`);
  }
  if (initial.distanceKm.trim() || initial.tollYen.trim()) {
    bits.push("距離・料金あり");
  }
  if (initial.notes.trim()) {
    bits.push("連絡あり");
  }
  let s =
    bits.length > 0 ? bits.join("・") : "保存済みの入力はまだありません（未入力の日もあります）";
  if (pendingPhotoCount > 0) {
    s += `（未保存の写真 ${pendingPhotoCount} 枚）`;
  }
  return s;
}

export function DailyReportPanel({
  initial,
  disabled,
}: {
  initial: DailyReportInitial;
  disabled?: boolean;
}) {
  const { main: initialMain, otherSelect: initialOther } = splitWorkTypesUiState(initial.workTypes);
  const [expanded, setExpanded] = useState(() => Boolean(disabled));
  const [mainPicked, setMainPicked] = useState(() => new Set(initialMain));
  const [otherPick, setOtherPick] = useState(initialOther);
  const [otherText, setOtherText] = useState(initial.workOther);
  const [removedPaths, setRemovedPaths] = useState<Set<string>>(() => new Set());
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [draftKm, setDraftKm] = useState(initial.distanceKm);
  const [draftToll, setDraftToll] = useState(initial.tollYen);
  const [draftNotes, setDraftNotes] = useState(initial.notes);
  const [isPending, startTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const showOther = otherPick === "その他";

  const visibleExisting = initial.photos.filter((p) => !removedPaths.has(p.path));
  const photoSlotsLeft =
    DAILY_REPORT_PHOTO_MAX_COUNT - visibleExisting.length - pendingPhotos.length;

  const summaryWhenCollapsed = useMemo(
    () => collapsedSummaryLine(initial, pendingPhotos.length),
    [initial, pendingPhotos.length],
  );

  useEffect(() => {
    setDraftKm(initial.distanceKm);
    setDraftToll(initial.tollYen);
    setDraftNotes(initial.notes);
  }, [initial.distanceKm, initial.tollYen, initial.notes]);

  useEffect(() => {
    if (disabled) {
      setExpanded(true);
    }
  }, [disabled]);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!lightboxUrl) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxUrl(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [lightboxUrl]);

  useEffect(() => {
    if (!showOther) {
      setOtherText("");
    }
  }, [showOther]);

  const clearEntireReportForm = () => {
    setMainPicked(new Set());
    setOtherPick("");
    setOtherText("");
    setRemovedPaths(new Set(initial.photos.map((p) => p.path)));
    setPendingPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
    setDraftKm("");
    setDraftToll("");
    setDraftNotes("");
    setFileInputKey((k) => k + 1);
  };

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

  const removeExisting = (path: string) => {
    setRemovedPaths((prev) => new Set(prev).add(path));
  };

  const removePending = (id: string) => {
    setPendingPhotos((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) {
        URL.revokeObjectURL(t.url);
      }
      return prev.filter((x) => x.id !== id);
    });
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) {
      return;
    }
    const room =
      DAILY_REPORT_PHOTO_MAX_COUNT -
      initial.photos.filter((p) => !removedPaths.has(p.path)).length -
      pendingPhotos.length;
    if (room <= 0) {
      e.target.value = "";
      return;
    }
    const added: PendingPhoto[] = [];
    let left = room;
    for (const file of Array.from(list)) {
      if (left <= 0) {
        break;
      }
      if (!ALLOWED_IMAGE.has(file.type) || file.size > DAILY_REPORT_PHOTO_MAX_BYTES) {
        continue;
      }
      added.push({
        id: globalThis.crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      });
      left--;
    }
    if (added.length) {
      setPendingPhotos((prev) => [...prev, ...added]);
    }
    e.target.value = "";
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    for (const p of pendingPhotos) {
      fd.append("photos", p.file);
    }
    startTransition(() => {
      void saveDailyReportAction(fd);
    });
  };

  const handleResetClick = () => {
    startResetTransition(async () => {
      await new Promise((r) => setTimeout(r, 120));
      clearEntireReportForm();
    });
  };

  const bodyVisible = expanded || disabled;

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">今日の日報</h2>
          {!disabled && !expanded && (
            <>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {summaryWhenCollapsed}
              </p>
              {(initial.photos.length > 0 || pendingPhotos.length > 0) && (
                <div className="flex gap-1.5 overflow-x-auto pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {initial.photos.map((p) => (
                    <button
                      key={p.path}
                      type="button"
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-400 dark:border-neutral-600 dark:bg-neutral-800 dark:focus-visible:ring-neutral-500"
                      onClick={() => setLightboxUrl(p.signedUrl)}
                      aria-label="写真を拡大"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.signedUrl} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                  {pendingPhotos.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-amber-400/90 bg-neutral-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-400 dark:bg-neutral-800"
                      onClick={() => setLightboxUrl(p.url)}
                      aria-label="未保存の写真を拡大"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              {pendingPhotos.length > 0 && (
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  未保存の写真があります。開いて内容を確認してください。
                </p>
              )}
            </>
          )}
        </div>
        {!disabled ? (
          <button
            type="button"
            className={toggleBtn}
            aria-expanded={expanded}
            aria-controls="daily-report-panel-body"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "閉じる" : "開く"}
          </button>
        ) : null}
      </div>

      <div
        id="daily-report-panel-body"
        hidden={!bodyVisible}
        className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-700"
      >
        <p className="text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          「取り消し」または「リセット」でフォームをすべて空にし、そのまま保存すると、この日の日報を削除します。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          {[...mainPicked].map((v) => (
            <input key={v} type="hidden" name="work_types" value={v} />
          ))}
          {otherPick ? <input type="hidden" name="work_types" value={otherPick} /> : null}
          {visibleExisting.map((p) => (
            <input key={p.path} type="hidden" name="keep_photo" value={p.path} readOnly />
          ))}

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

            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              <button
                type="button"
                disabled={disabled}
                className="font-medium text-neutral-800 underline underline-offset-2 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
                onClick={clearEntireReportForm}
              >
                取り消し
              </button>
              <span className="ml-2">（作業・写真・距離・料金・連絡をすべて空にする）</span>
            </p>
          </fieldset>

          <div className={showOther ? "space-y-1.5" : "hidden"}>
            <label
              htmlFor="rep-work-other"
              className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-400"
            >
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

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="rep-km"
                  className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  移動距離（km）
                </label>
                <input
                  id="rep-km"
                  name="distance_km"
                  type="text"
                  inputMode="decimal"
                  disabled={disabled}
                  value={draftKm}
                  onChange={(e) => setDraftKm(e.target.value)}
                  placeholder="例: 42.5"
                  autoComplete="off"
                  className={field}
                />
              </div>
              <div>
                <label
                  htmlFor="rep-toll"
                  className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-400"
                >
                  高速料金（円）
                </label>
                <input
                  id="rep-toll"
                  name="toll_yen"
                  type="text"
                  inputMode="numeric"
                  disabled={disabled}
                  value={draftToll}
                  onChange={(e) => setDraftToll(e.target.value)}
                  placeholder="例: 1200"
                  autoComplete="off"
                  className={field}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="rep-notes"
                className="mb-1.5 block text-sm font-medium text-neutral-600 dark:text-neutral-400"
              >
                連絡事項（自由入力）
              </label>
              <textarea
                id="rep-notes"
                name="notes"
                rows={3}
                disabled={disabled}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                maxLength={4000}
                placeholder="連絡・依頼・特記事項など"
                className={`${field} resize-y`}
              />
            </div>
          </div>

          <fieldset className="min-w-0 space-y-2 border-0 p-0">
            <legend className={legendClass}>
              現場写真（任意・最大{DAILY_REPORT_PHOTO_MAX_COUNT}枚・プレビュー）
            </legend>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              JPEG / PNG / WebP、1枚あたり{DAILY_REPORT_PHOTO_MAX_BYTES / (1024 * 1024)}MB まで。
            </p>

            {(visibleExisting.length > 0 || pendingPhotos.length > 0) && (
              <ul className="grid grid-cols-4 gap-2">
                {visibleExisting.map((p) => (
                  <li
                    key={p.path}
                    className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800"
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      className="absolute inset-0 z-0 flex items-stretch justify-stretch"
                      onClick={() => setLightboxUrl(p.signedUrl)}
                      aria-label="写真を拡大"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.signedUrl} alt="" className="size-full object-cover" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExisting(p.path);
                      }}
                      className="absolute right-1 top-1 z-10 rounded-lg bg-neutral-950/80 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white/90 dark:text-neutral-950 sm:px-2 sm:py-1 sm:text-xs"
                    >
                      削除
                    </button>
                  </li>
                ))}
                {pendingPhotos.map((p) => (
                  <li
                    key={p.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800"
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      className="absolute inset-0 z-0 flex items-stretch justify-stretch"
                      onClick={() => setLightboxUrl(p.url)}
                      aria-label="写真を拡大"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="size-full object-cover" />
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        removePending(p.id);
                      }}
                      className="absolute right-1 top-1 z-10 rounded-lg bg-neutral-950/80 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-white/90 dark:text-neutral-950 sm:px-2 sm:py-1 sm:text-xs"
                    >
                      削除
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <input
                key={fileInputKey}
                id="rep-photos"
                type="file"
                accept={DAILY_REPORT_PHOTO_ACCEPT}
                multiple
                disabled={disabled || photoSlotsLeft <= 0}
                onChange={onPickFiles}
                className="sr-only"
              />
              <label
                htmlFor="rep-photos"
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-3 text-sm font-medium text-neutral-800 dark:border-neutral-500 dark:bg-neutral-950 dark:text-neutral-100 ${
                  disabled || photoSlotsLeft <= 0
                    ? "pointer-events-none opacity-50"
                    : "hover:border-neutral-400"
                }`}
              >
                {photoSlotsLeft <= 0 ? "これ以上追加できません" : "写真を追加"}
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={disabled || isPending || isResetPending}
            className="w-full rounded-2xl border border-neutral-300 bg-neutral-900 px-4 py-3.5 text-base font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60 dark:border-neutral-600 dark:bg-white dark:text-neutral-950"
            aria-busy={isPending}
          >
            {isPending ? "保存中…" : "日報を保存"}
          </button>

          <div className="flex flex-col items-stretch gap-1.5 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <button
              type="button"
              disabled={disabled || isPending || isResetPending}
              onClick={handleResetClick}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm active:scale-[0.99] disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
              aria-busy={isResetPending}
            >
              {isResetPending ? "実行中" : "リセット"}
            </button>
            <p className="text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              取り消しと同じく、入力をすべて空に戻します（保存で反映。すべて空なら日報を削除）
            </p>
          </div>
        </form>
      </div>
    </section>

      {portalReady && lightboxUrl
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="写真プレビュー"
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
              onClick={() => setLightboxUrl(null)}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-[1] rounded-xl border border-white/20 bg-neutral-950/90 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm dark:border-neutral-600 dark:bg-white/95 dark:text-neutral-950"
                onClick={() => setLightboxUrl(null)}
              >
                閉じる
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt=""
                className="max-h-[85vh] max-w-[min(100%,96vw)] rounded-lg object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

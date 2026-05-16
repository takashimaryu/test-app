"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { saveDailyReport, submitDailyReport } from "@/app/employee/report-actions";
import { reportSaveErrorMessage } from "@/lib/daily-report/report-save-errors";
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
  submittedAt: string | null;
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

function formatSubmittedAt(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function collapsedSummaryLine(initial: DailyReportInitial, pendingPhotoCount: number): string {
  const bits: string[] = [];
  if (initial.workTypes.length) {
    bits.push(`作業${initial.workTypes.length}種`);
  }
  if (initial.photos.length) {
    bits.push(`日報写真${initial.photos.length}枚`);
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
  const router = useRouter();
  const touchedRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "submitted">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    touchedRef.current = true;
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
    touchedRef.current = true;
    setRemovedPaths((prev) => new Set(prev).add(path));
  };

  const removePending = (id: string) => {
    touchedRef.current = true;
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
      touchedRef.current = true;
      setPendingPhotos((prev) => [...prev, ...added]);
    }
    e.target.value = "";
  };

  function workTypesForSave(): string[] {
    const w = [...mainPicked];
    if (otherPick) {
      w.push(otherPick);
    }
    return w;
  }

  function hasPhotosForSave(): boolean {
    return (
      initial.photos.some((p) => !removedPaths.has(p.path)) || pendingPhotos.length > 0
    );
  }

  function shouldAutoSave(): boolean {
    const wt = workTypesForSave();
    const hasPhotos = hasPhotosForSave();
    const allEmpty =
      wt.length === 0 &&
      !hasPhotos &&
      draftNotes.trim() === "" &&
      draftKm.trim() === "" &&
      draftToll.trim() === "" &&
      (!showOther || otherText.trim() === "");
    if (allEmpty) {
      return true;
    }
    const complete =
      wt.length > 0 &&
      hasPhotos &&
      (!wt.includes("その他") || otherText.trim() !== "");
    return complete;
  }

  function canSubmitReport(): boolean {
    const wt = workTypesForSave();
    return (
      wt.length > 0 &&
      hasPhotosForSave() &&
      (!wt.includes("その他") || otherText.trim() !== "")
    );
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    for (const v of mainPicked) {
      fd.append("work_types", v);
    }
    if (otherPick) {
      fd.append("work_types", otherPick);
    }
    for (const p of initial.photos) {
      if (!removedPaths.has(p.path)) {
        fd.append("keep_photo", p.path);
      }
    }
    fd.set("work_other", showOther ? otherText : "");
    fd.set("distance_km", draftKm);
    fd.set("toll_yen", draftToll);
    fd.set("notes", draftNotes);
    for (const p of pendingPhotos) {
      fd.append("photos", p.file);
    }
    return fd;
  }

  useEffect(() => {
    if (disabled || !touchedRef.current) {
      return;
    }
    if (!shouldAutoSave()) {
      return;
    }

    let cancelled = false;
    const idleHolder: { id?: number } = {};
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) {
          return;
        }
        setSaveStatus("saving");
        setSaveError(null);
        const fd = buildFormData();
        try {
          const r = await saveDailyReport(fd);
          if (cancelled) {
            return;
          }
          if (r.ok) {
            setPendingPhotos((prev) => {
              prev.forEach((p) => URL.revokeObjectURL(p.url));
              return [];
            });
            setRemovedPaths(new Set());
            setSaveError(null);
            touchedRef.current = false;
            router.refresh();
            setSaveStatus("saved");
            idleHolder.id = window.setTimeout(() => {
              if (!cancelled) {
                setSaveStatus("idle");
              }
            }, 2000);
          } else {
            setSaveError(reportSaveErrorMessage(r.code));
            setSaveStatus("idle");
          }
        } catch {
          if (!cancelled) {
            setSaveError("日報の保存に失敗しました。通信環境を確認してください。");
            setSaveStatus("idle");
          }
        }
      })();
    }, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleHolder.id !== undefined) {
        window.clearTimeout(idleHolder.id);
      }
    };
  }, [
    disabled,
    mainPicked,
    otherPick,
    otherText,
    draftKm,
    draftToll,
    draftNotes,
    removedPaths,
    pendingPhotos,
    initial.photos,
    showOther,
    router,
  ]);

  const handleResetClick = () => {
    startResetTransition(async () => {
      await new Promise((r) => setTimeout(r, 120));
      setSaveStatus("saving");
      setSaveError(null);
      const fd = new FormData();
      fd.set("work_other", "");
      fd.set("distance_km", "");
      fd.set("toll_yen", "");
      fd.set("notes", "");
      try {
        const r = await saveDailyReport(fd);
        if (r.ok) {
          clearEntireReportForm();
          touchedRef.current = false;
          router.refresh();
          setSaveStatus("idle");
          setSaveError(null);
        } else {
          setSaveError(reportSaveErrorMessage(r.code));
          setSaveStatus("idle");
        }
      } catch {
        setSaveError("日報の保存に失敗しました。通信環境を確認してください。");
        setSaveStatus("idle");
      }
    });
  };

  const handleSubmitReportClick = async () => {
    if (disabled || !canSubmitReport()) {
      return;
    }
    setSubmitStatus("submitting");
    setSubmitError(null);
    setSaveError(null);
    try {
      const r = await submitDailyReport(buildFormData());
      if (r.ok) {
        setPendingPhotos((prev) => {
          prev.forEach((p) => URL.revokeObjectURL(p.url));
          return [];
        });
        setRemovedPaths(new Set());
        touchedRef.current = false;
        router.refresh();
        setSubmitStatus("submitted");
        return;
      }
      setSubmitError(reportSaveErrorMessage(r.code));
      setSubmitStatus("idle");
    } catch {
      setSubmitError("日報を送信できませんでした。通信環境を確認してください。");
      setSubmitStatus("idle");
    }
  };

  const bodyVisible = expanded || disabled;
  const reportSubmittable = canSubmitReport();

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">日報</h2>
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
            className={`${toggleBtn} min-w-[3.25rem] px-3.5 py-2.5 text-2xl leading-none tabular-nums`}
            aria-expanded={expanded}
            aria-controls="daily-report-panel-body"
            aria-label={expanded ? "日報を閉じる" : "日報を開く"}
            onClick={() => setExpanded((v) => !v)}
          >
            <span aria-hidden="true">{expanded ? "▲" : "▼"}</span>
          </button>
        ) : null}
      </div>

      <div
        id="daily-report-panel-body"
        hidden={!bodyVisible}
        className="space-y-4 border-t border-neutral-200 pt-4 dark:border-neutral-700"
      >
        <form
          className="space-y-4"
          encType="multipart/form-data"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div className="min-h-[2.5rem] space-y-1" aria-live="polite">
            {saveError ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{saveError}</p>
            ) : null}
            {submitError ? (
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{submitError}</p>
            ) : null}
            {saveStatus === "saving" ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">保存中…</p>
            ) : null}
            {saveStatus === "saved" ? (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">保存済み</p>
            ) : null}
            {initial.submittedAt ? (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                送信済み（{formatSubmittedAt(initial.submittedAt)}）
              </p>
            ) : null}
            {submitStatus === "submitted" && !initial.submittedAt ? (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                日報を送信しました
              </p>
            ) : null}
          </div>

          <fieldset className="min-w-0 space-y-3 border-0 p-0">
            <legend className={legendClass}>
              <span className="text-neutral-800 dark:text-neutral-100">作業内容（複数選択可）</span>
              <span className="text-rose-600 dark:text-rose-400">※必須</span>
            </legend>

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

            <div>
              <select
                id="rep-other-dd"
                aria-label="その他の区分"
                disabled={disabled}
                value={otherPick}
                onChange={(e) => {
                  touchedRef.current = true;
                  setOtherPick(e.target.value);
                }}
                className={`${btnBase} w-full cursor-pointer px-3 outline-none ring-offset-2 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:ring-offset-neutral-900 ${
                  otherPick ? `${btnOn} focus-visible:ring-sky-300` : `${btnOff} focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-500`
                }`}
              >
                <option value="">その他</option>
                {WORK_OTHER_GROUP.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === "その他" ? "その他（自由入力）" : opt}
                  </option>
                ))}
              </select>
            </div>
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
              onChange={(e) => {
                touchedRef.current = true;
                setOtherText(e.target.value);
              }}
              maxLength={4000}
              placeholder="作業の具体的な内容"
              className={`${field} resize-y`}
            />
          </div>

          <fieldset className="min-w-0 space-y-2 border-0 p-0">
            <legend className={legendClass}>
              <span className="text-neutral-800 dark:text-neutral-100">
                日報写真（最大{DAILY_REPORT_PHOTO_MAX_COUNT}枚・プレビュー）
              </span>
              <span className="text-rose-600 dark:text-rose-400">※必須</span>
            </legend>

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
                  onChange={(e) => {
                    touchedRef.current = true;
                    setDraftKm(e.target.value);
                  }}
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
                  onChange={(e) => {
                    touchedRef.current = true;
                    setDraftToll(e.target.value);
                  }}
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
                onChange={(e) => {
                  touchedRef.current = true;
                  setDraftNotes(e.target.value);
                }}
                maxLength={4000}
                placeholder="連絡・依頼・特記事項など"
                className={`${field} resize-y`}
              />
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-1.5 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            {reportSubmittable ? (
              <button
                type="button"
                disabled={disabled || submitStatus === "submitting" || saveStatus === "saving"}
                onClick={handleSubmitReportClick}
                className="w-full rounded-2xl border border-sky-700 bg-sky-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm active:scale-[0.99] disabled:opacity-60 dark:border-sky-400 dark:bg-sky-500 dark:text-white"
                aria-busy={submitStatus === "submitting"}
              >
                {submitStatus === "submitting" ? "送信中…" : "日報を送信"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={disabled || saveStatus === "saving" || isResetPending || submitStatus === "submitting"}
              onClick={handleResetClick}
              className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm active:scale-[0.99] disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
              aria-busy={isResetPending}
            >
              {isResetPending ? "実行中" : "リセット"}
            </button>
            <p className="text-center text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              入力をすべて空に戻します（すぐに反映）
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

"use client";

import { useFormStatus } from "react-dom";

/**
 * 親の form の送信中に disabled と文言切り替え（useFormStatus）。
 */
export function FormPendingSubmit({
  className,
  label,
  pendingLabel = "処理中…",
  disabled = false,
}: {
  className: string;
  label: string;
  pendingLabel?: string;
  /** フォーム全体を無効化（例: バックエンド未準備） */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const off = pending || disabled;
  return (
    <button type="submit" disabled={off} className={className} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

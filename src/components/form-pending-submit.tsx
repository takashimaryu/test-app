"use client";

import { useFormStatus } from "react-dom";

/**
 * 親の form の送信中に disabled と文言切り替え（useFormStatus）。
 */
export function FormPendingSubmit({
  className,
  label,
  pendingLabel = "処理中…",
}: {
  className: string;
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

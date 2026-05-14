"use client";

/**
 * LINE ログイン開始。 * `<button>` + `location.assign` だと、ハイドレーション前のタップや一部モバイル環境で反応しないことがあるため、
 * 常に動く **素のリンク（GET）** で `/api/auth/line` に入る。
 */
export function LineLoginButton() {
  return (
    <a
      href="/api/auth/line?next=/employee"
      className="flex min-h-14 w-full touch-manipulation items-center justify-center rounded-2xl bg-[#06C755] px-4 text-lg font-semibold text-white no-underline shadow-sm active:scale-[0.99]"
    >
      LINE でログイン
    </a>
  );
}

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function isSupabaseEnvReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

export default async function Home() {
  const supabaseReady = isSupabaseEnvReady();
  let isLoggedIn = false;

  if (supabaseReady) {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = Boolean(user);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
        <header className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            現場向け 勤怠・日報（MVP 開発中）
          </p>
          <h1 className="text-3xl font-semibold leading-tight">
            ひと目で
            <br />
            打刻・日報
          </h1>
        </header>

        <section
          className={`rounded-2xl border px-4 py-4 text-base leading-relaxed ${
            supabaseReady
              ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-50"
              : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
          }`}
          aria-live="polite"
        >
          <p className="font-medium">
            {supabaseReady ? "Supabase 接続の準備OK" : "Supabase 未設定"}
          </p>
          <p className="mt-2 text-sm leading-6 opacity-90">
            {supabaseReady
              ? "LINE ログインは「従業員ログイン」から。Supabase と LINE の画面設定も必要です（下のチェックリスト）。"
              : "プロジェクト直下に .env.local を作り、.env.example を見ながら URL と anon key を貼り付けてください。"}
          </p>
        </section>

        {supabaseReady ? (
          <div className="flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/employee"
                  className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 text-lg font-semibold text-white dark:bg-white dark:text-neutral-950"
                >
                  マイページへ
                </Link>
                <Link
                  href="/admin"
                  className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-neutral-300 px-4 text-base font-semibold text-neutral-900 dark:border-neutral-600 dark:text-neutral-50"
                >
                  管理画面へ
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-neutral-900 px-4 text-lg font-semibold text-white dark:bg-white dark:text-neutral-950"
              >
                従業員ログイン（LINE）
              </Link>
            )}
          </div>
        ) : null}

        <section className="space-y-3">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            いまの進捗（予定どおり）
          </p>
          <ol className="space-y-2 text-base">
            <li className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                ✅
              </span>
              初期環境・Next.js・Tailwind
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                ✅
              </span>
              Supabase 接続コード（ライブラリ導入済み）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                ✅
              </span>
              LINE ログイン（コード側）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                ✅
              </span>
              出退勤（打刻・JST 1 日 1 往復）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                ✅
              </span>
              日報（マイページで今日分を入力・保存）
            </li>
            <li className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
              <span className="text-lg" aria-hidden>
                ⏳
              </span>
              管理画面
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LineLoginButton } from "@/components/line-login-button";

const errorMessages: Record<string, string> = {
  missing_code:
    "ログインの戻り先に必要な情報（code）がありませんでした。Supabase の Authentication → URL Configuration の Redirect URLs に、http://localhost:3000/auth/callback が入っているか確認し、もう一度 LINE でログインしてください。",
  config: "サーバー設定が足りません（Supabase の環境変数）。",
  exchange:
    "ログインの確定に失敗しました。Supabase と LINE の設定（コールバックURLなど）を確認してください。",
  line_env:
    "LINE 用の環境変数が足りません。.env.local に LINE_CHANNEL_ID と LINE_CHANNEL_SECRET を入れてから、開発サーバーを再起動してください。",
  line_state:
    "ログイン途中の情報（セッション用クッキー）が揃いませんでした。ブラウザの別タブやプライベートモードを避け、同じタブで「LINE でログイン」からやり直してください。",
  line_token:
    "LINE からトークンを取れませんでした。Channel ID / Channel secret、Callback URL（/api/auth/line/callback）、redirect_uri の一致を確認してください。",
  line_supabase:
    "LINE までは成功しましたが、Supabase でセッションを作れませんでした。ダッシュボードの custom:line の Issuer（https://access.line.me）と Client ID、NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER の一致を確認し、次を実行: npm run line:oidc-jwk（skip_nonce_check などを有効化）。",
  line_oauth: "LINE の認可画面でエラーが返りました。",
};

/** コールバック URL のオリジンが「自前開発っぽい」か（hostname 判定だけに依存しない） */
function isLocalDevCallbackUrl(url: string | null): boolean {
  if (!url) {
    return false;
  }
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h === "::1") {
      return true;
    }
    if (h.endsWith(".local")) {
      return true;
    }
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/u.test(h)) {
      return true;
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/u.test(h)) {
      return true;
    }
    if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/u.test(h)) {
      return true;
    }
    if (h.endsWith(".ngrok-free.app") || h.endsWith(".ngrok.io") || h.endsWith(".loca.lt")) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function LoginClient({
  serverLineCallbackUrl,
}: {
  /** サーバーが LINE に送る redirect_uri（Host ヘッダから組み立て。`LINE_REDIRECT_ORIGIN` があればそれ） */
  serverLineCallbackUrl?: string | null;
}) {
  const searchParams = useSearchParams();
  const [browserCallbackUrl, setBrowserCallbackUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBrowserCallbackUrl(`${window.location.origin}/api/auth/line/callback`);
  }, []);

  const lineCallbackUrl = (serverLineCallbackUrl?.trim() || browserCallbackUrl) ?? null;
  const showLineSetup = Boolean(lineCallbackUrl) && isLocalDevCallbackUrl(lineCallbackUrl);
  const uriMismatch = Boolean(
    serverLineCallbackUrl?.trim() &&
      browserCallbackUrl &&
      serverLineCallbackUrl.trim() !== browserCallbackUrl,
  );

  async function copyLineCallbackUrl() {
    if (!lineCallbackUrl) {
      return;
    }
    try {
      await navigator.clipboard.writeText(lineCallbackUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  const errorKey = searchParams.get("error") ?? "";
  const oauthErr = searchParams.get("err");
  const oauthDesc = searchParams.get("desc");

  /** クエリの desc（Next の searchParams は通常すでにデコード済み） */
  function normalizeDesc(raw: string | null): string {
    if (!raw) {
      return "";
    }
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  const descDecoded = normalizeDesc(oauthDesc);

  let errorText: string | null = null;
  if (errorKey === "oauth" && oauthErr) {
    const detail = descDecoded ? `。${descDecoded}` : "";
    errorText = `ログイン先からエラーが返りました（${oauthErr}）${detail}`;
  } else if (errorKey === "line_oauth") {
    const parts: string[] = [errorMessages.line_oauth];
    if (oauthErr) {
      parts.push(`コード: ${oauthErr}`);
    }
    if (descDecoded) {
      parts.push(descDecoded);
    }
    errorText = parts.join(" ");
  } else if (errorKey) {
    const base = errorMessages[errorKey] ?? "ログインに失敗しました。";
    const errExtra = searchParams.get("err");
    const tailBits: string[] = [];
    if (errExtra) {
      tailBits.push(errExtra);
    }
    if (descDecoded) {
      tailBits.push(descDecoded);
    }
    const tail = tailBits.length ? ` 詳細: ${tailBits.join(" — ")}` : "";
    errorText = `${base}${tail}`;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-10">
        <header className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">従業員ログイン</p>
          <h1 className="text-3xl font-semibold leading-tight">LINE で入る</h1>
        </header>

        {errorText ? (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50"
            role="alert"
          >
            {errorText}
          </p>
        ) : null}

        {lineCallbackUrl && showLineSetup ? (
          <section
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
            aria-label="LINE の登録手順"
          >
            <p className="text-base font-semibold">LINE が「redirect_uri」で怒るとき（ここから）</p>
            <p className="mt-2 rounded-lg border border-amber-300/80 bg-amber-100/80 px-3 py-2 text-xs leading-relaxed dark:border-amber-700 dark:bg-amber-900/40">
              <strong>スマホをメインにする開発のコツ:</strong> PC は{" "}
              <code className="rounded bg-black/10 px-1">localhost</code>、スマホは{" "}
              <code className="rounded bg-black/10 px-1">192.168…</code> になり、LINE の Callback
              がズレやすいです。<strong>ngrok や Vercel のプレビューなど、https の URL を 1 本だけ</strong>
              決めて、PC もスマホも<strong>同じ URL</strong>で開くと、同じトラブルがほぼ消えます（
              <code className="rounded bg-black/10 px-1">LINE_REDIRECT_ORIGIN</code> にそのオリジンを書く）。
            </p>
            <p className="mt-2">
              登録済みでもエラーになるときは、<strong>実際に送っている URL が別</strong>なことが多いです。下の
              <strong>サーバー用</strong>を LINE の Callback URL に<strong>一字一句</strong>合わせてください。
            </p>
            {uriMismatch ? (
              <div
                className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-950 dark:border-red-800 dark:bg-red-950/50 dark:text-red-50"
                role="status"
              >
                <p className="font-semibold">サーバーとブラウザで URL が違います</p>
                <p className="mt-1">
                  LINE に登録するのは<strong>サーバー用</strong>だけです（緑ボタンから送る redirect_uri
                  はこちら）。
                </p>
                <p className="mt-2 break-all font-mono text-[11px] opacity-90">
                  ブラウザ表示: {browserCallbackUrl}
                </p>
              </div>
            ) : null}
            <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-100">サーバー用（コピーするのはこれ）</p>
            <p className="mt-3 break-all rounded-lg bg-white/90 px-3 py-2 font-mono text-xs text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
              {lineCallbackUrl}
            </p>
            <button
              type="button"
              onClick={() => void copyLineCallbackUrl()}
              className="mt-3 w-full rounded-xl bg-neutral-900 py-3 text-base font-semibold text-white active:scale-[0.99] dark:bg-white dark:text-neutral-950"
            >
              {copied ? "コピーした！" : "↑ この URL をコピーする"}
            </button>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
              <li>
                PC で{" "}
                <a
                  href="https://developers.line.biz/console/"
                  className="font-semibold underline underline-offset-2"
                  target="_blank"
                  rel="noreferrer"
                >
                  LINE Developers を開く
                </a>
              </li>
              <li>自分のチャネル →「LINE ログイン」の画面を開く</li>
              <li>
                「Callback URL」の欄に、さっきコピーしたものを<strong>そのまま貼る</strong>
                → 保存
              </li>
              <li>このページに戻って、もう一度緑の「LINE でログイン」</li>
            </ol>
            <p className="mt-3 text-xs opacity-90">
              スマホの <code className="rounded bg-black/10 px-1">192.168…</code> と PC の{" "}
              <code className="rounded bg-black/10 px-1">localhost</code> は別。両方使うなら、それぞれで
              開いたこの画面からコピーして、LINE に<strong>2 行</strong>足す。
            </p>
            <p className="mt-3 text-xs opacity-90">
              LINE の URL 欄に <code className="rounded bg-black/10 px-1">http://192.168…</code>{" "}
              を入れてもエラーが消えないチャネルは、<strong>https の公開 URL</strong>（ngrok など）が必要なことがあります。そのときは{" "}
              <code className="rounded bg-black/10 px-1">.env.local</code> に{" "}
              <code className="rounded bg-black/10 px-1">LINE_REDIRECT_ORIGIN=https://…</code>{" "}
              を書いて、同じオリジンを Callback URL に登録し、サーバを再起動。
            </p>
            <p className="mt-2 text-xs opacity-90">
              あと、LINE のログイン画面の URL に出る{" "}
              <code className="rounded bg-black/10 px-1">client_id=…</code> の数字と、
              <code className="rounded bg-black/10 px-1">.env.local</code> の{" "}
              <code className="rounded bg-black/10 px-1">LINE_CHANNEL_ID</code> が同じチャネルかも確認。
            </p>
          </section>
        ) : null}

        <LineLoginButton />

        <Link
          href="/"
          className="text-center text-sm text-neutral-500 underline underline-offset-4 dark:text-neutral-400"
        >
          トップへ戻る
        </Link>
      </main>
    </div>
  );
}

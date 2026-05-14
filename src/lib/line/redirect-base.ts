import type { NextRequest } from "next/server";

/** Host / X-Forwarded-* だけからオリジンを組み立てる（環境変数は見ない） */
function lineRedirectBaseFromForwardedHeaders(headers: Headers): string {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    headers.get("host")?.trim() ||
    "";

  const protoRaw = headers.get("x-forwarded-proto")?.split(",")[0]?.trim()?.toLowerCase();
  const proto = protoRaw === "https" || protoRaw === "http" ? protoRaw : "http";

  if (!host) {
    return "";
  }
  return `${proto}://${host}`.replace(/\/$/u, "");
}

/**
 * LINE の redirect_uri のオリジン（パスなし）。
 * `LINE_REDIRECT_ORIGIN` → `Host` ヘッダ系 → `request.nextUrl.origin` の順。
 */
export function getLineOAuthRedirectBase(request: NextRequest): string {
  const fromEnv = process.env.LINE_REDIRECT_ORIGIN?.trim().replace(/\/$/u, "");
  if (fromEnv) {
    return fromEnv;
  }
  const fromHeaders = lineRedirectBaseFromForwardedHeaders(request.headers);
  if (fromHeaders) {
    return fromHeaders;
  }
  return request.nextUrl.origin.replace(/\/$/u, "");
}

export function getLineOAuthRedirectUri(request: NextRequest): string {
  return `${getLineOAuthRedirectBase(request)}/api/auth/line/callback`;
}

/** ログイン画面（RSC）で「サーバーが LINE に送る redirect_uri」と同じ文字列を出す用 */
export function getLineOAuthRedirectUriForLoginPage(headers: Headers): string | null {
  const fromEnv = process.env.LINE_REDIRECT_ORIGIN?.trim().replace(/\/$/u, "");
  const base = fromEnv || lineRedirectBaseFromForwardedHeaders(headers);
  if (!base) {
    return null;
  }
  return `${base}/api/auth/line/callback`;
}

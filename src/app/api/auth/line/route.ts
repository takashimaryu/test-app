import { NextResponse, type NextRequest } from "next/server";
import { getLineOAuthRedirectBase } from "@/lib/line/redirect-base";
import { LINE_AUTHORIZE_URL } from "@/lib/line/constants";
import {
  createCodeChallenge,
  createCodeVerifier,
  createOAuthSecret,
} from "@/lib/line/pkce";

const COOKIE = {
  state: "line_oauth_state",
  pkce: "line_pkce_verifier",
  next: "line_oauth_next",
} as const;

function cookieOpts() {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  };
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/employee";
  }
  return raw;
}

/**
 * アプリ側で LINE 認可を開始する（Supabase の OAuth では token リクエストに
 * id_token_key_type=JWK を付けられないため、ここで PKCE 付き authorize に送る）。
 */
export async function GET(request: NextRequest) {
  const site = getLineOAuthRedirectBase(request);
  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  if (!channelId || !channelSecret) {
    return NextResponse.redirect(new URL("/login?error=line_env", site));
  }

  // LINE は redirect_uri を登録値と完全一致で照合する。localhost と 127.0.0.1 は別物。
  // Host / X-Forwarded-* からオリジンを組む（`LINE_REDIRECT_ORIGIN` で上書き可）。
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const redirectUri = `${site}/api/auth/line/callback`;

  const state = createOAuthSecret();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);

  const authUrl = new URL(LINE_AUTHORIZE_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", channelId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "openid profile");
  // nonce は id_token に載ると Supabase 側検証とズレやすい（LINE + 自前 token 交換）。
  // OpenID の必須ではないため付けない。
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl);
  const o = cookieOpts();
  res.cookies.set(COOKIE.state, state, o);
  res.cookies.set(COOKIE.pkce, codeVerifier, o);
  res.cookies.set(COOKIE.next, next, o);
  return res;
}

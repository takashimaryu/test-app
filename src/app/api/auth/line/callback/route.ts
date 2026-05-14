import type { Provider } from "@supabase/auth-js";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LINE_TOKEN_URL } from "@/lib/line/constants";
import { getLineOAuthRedirectBase } from "@/lib/line/redirect-base";
import { timingSafeStringEqual } from "@/lib/line/pkce";
import { getSupabaseProjectUrl } from "@/lib/supabase/env";

const COOKIE = {
  state: "line_oauth_state",
  pkce: "line_pkce_verifier",
  next: "line_oauth_next",
} as const;

function clearLineCookies(response: NextResponse) {
  const z = { maxAge: 0, path: "/" };
  response.cookies.set(COOKIE.state, "", z);
  response.cookies.set(COOKIE.pkce, "", z);
  response.cookies.set(COOKIE.next, "", z);
}

function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/employee";
  }
  return raw;
}

type LineTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

/**
 * LINE の token エンドポイントに id_token_key_type=JWK を付けて ES256 の id_token を取得し、
 * Supabase の signInWithIdToken(custom:line) でセッションを作る。
 */
export async function GET(request: NextRequest) {
  const siteOrigin = getLineOAuthRedirectBase(request);
  const err = request.nextUrl.searchParams.get("error");
  const errDesc = request.nextUrl.searchParams.get("error_description");
  if (err) {
    const q = new URLSearchParams({ error: "line_oauth", err });
    if (errDesc) {
      q.set("desc", errDesc.slice(0, 300));
    }
    const r = NextResponse.redirect(new URL(`/login?${q}`, siteOrigin));
    clearLineCookies(r);
    return r;
  }

  const code = request.nextUrl.searchParams.get("code");
  const stateQ = request.nextUrl.searchParams.get("state");
  const stateC = request.cookies.get(COOKIE.state)?.value;
  const codeVerifier = request.cookies.get(COOKIE.pkce)?.value;
  const nextRaw = request.cookies.get(COOKIE.next)?.value;

  if (!code || !stateQ || !stateC || !codeVerifier) {
    const r = NextResponse.redirect(new URL("/login?error=line_state", siteOrigin));
    clearLineCookies(r);
    return r;
  }

  if (!timingSafeStringEqual(stateQ, stateC)) {
    const r = NextResponse.redirect(new URL("/login?error=line_state", siteOrigin));
    clearLineCookies(r);
    return r;
  }

  const channelId = process.env.LINE_CHANNEL_ID?.trim();
  const channelSecret = process.env.LINE_CHANNEL_SECRET?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const provider =
    process.env.NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER?.trim() || "custom:line";

  if (!channelId || !channelSecret || !url || !anonKey) {
    const r = NextResponse.redirect(new URL("/login?error=line_env", siteOrigin));
    clearLineCookies(r);
    return r;
  }

  // 認可リクエストと同じ redirect_uri を token 交換にも渡す必要がある。
  const redirectUri = `${siteOrigin}/api/auth/line/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: channelId,
    client_secret: channelSecret,
    code_verifier: codeVerifier,
    id_token_key_type: "JWK",
  });

  const tokenRes = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const tokenJson = (await tokenRes.json()) as LineTokenResponse;
  if (!tokenRes.ok || !tokenJson.id_token) {
    const q = new URLSearchParams({ error: "line_token" });
    if (tokenJson.error) {
      q.set("err", tokenJson.error.slice(0, 120));
    }
    if (tokenJson.error_description) {
      q.set("desc", tokenJson.error_description.slice(0, 280));
    }
    const r = NextResponse.redirect(new URL(`/login?${q}`, siteOrigin));
    clearLineCookies(r);
    return r;
  }

  const nextPath = safeNextPath(nextRaw);
  const redirectUrl = new URL(nextPath, siteOrigin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(getSupabaseProjectUrl(url), anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const idCreds: Parameters<typeof supabase.auth.signInWithIdToken>[0] = {
    provider: provider as Provider,
    token: tokenJson.id_token,
  };
  if (tokenJson.access_token) {
    idCreds.access_token = tokenJson.access_token;
  }

  const { error } = await supabase.auth.signInWithIdToken(idCreds);

  if (error) {
    const q = new URLSearchParams({ error: "line_supabase" });
    const status =
      "status" in error && typeof error.status === "number"
        ? String(error.status)
        : "";
    const msg = [error.message, error.code, status].filter(Boolean).join(" — ");
    if (msg) {
      q.set("desc", msg.slice(0, 320));
    }
    const r = NextResponse.redirect(new URL(`/login?${q}`, siteOrigin));
    clearLineCookies(r);
    return r;
  }

  clearLineCookies(response);
  return response;
}

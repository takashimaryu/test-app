import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseProjectUrl } from "@/lib/supabase/env";

/**
 * LINE ログイン後、Supabase が付け替え用の「コード」を渡す入口。
 * リダイレクト応答にセッション用クッキーを載せてから、従業員ページへ送ります。
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = request.nextUrl.searchParams.get("next") ?? "/employee";
  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthDesc = request.nextUrl.searchParams.get("error_description");

  if (!code) {
    if (oauthError) {
      const q = new URLSearchParams({ error: "oauth", err: oauthError });
      if (oauthDesc) {
        q.set("desc", oauthDesc.slice(0, 300));
      }
      return NextResponse.redirect(new URL(`/login?${q.toString()}`, origin));
    }
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.redirect(new URL("/login?error=config", origin));
  }

  const redirectUrl = new URL(nextPath, origin);
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=exchange", origin));
  }

  return response;
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseNoStoreFetch } from "@/lib/supabase/fetch-no-store";
import { getSupabaseProjectUrl } from "@/lib/supabase/env";

/**
 * サーバー（画面を組み立てる側）から Supabase にアクセスするとき使う接続。
 * 後で「ログイン状態の確認」などにも使います。
 */
export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を書いてください。",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseProjectUrl(url), anonKey, {
    global: {
      fetch: supabaseNoStoreFetch,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component から set できない場合がある（ミドルウェアで更新する想定）
        }
      },
    },
  });
}

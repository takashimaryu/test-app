import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseProjectUrl } from "@/lib/supabase/env";

/**
 * ブラウザ（スマホの画面）から Supabase にアクセスするとき使う接続。
 * 「ログイン後の画面」や「ボタンを押したときの保存」などで使います。
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase の環境変数が未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を書いてください。",
    );
  }

  return createBrowserClient(getSupabaseProjectUrl(url), anonKey);
}

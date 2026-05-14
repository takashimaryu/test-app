"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className="min-h-12 w-full rounded-2xl border border-neutral-300 bg-white px-4 text-base font-medium text-neutral-900 dark:border-neutral-600 dark:bg-neutral-900 dark:text-neutral-50"
    >
      ログアウト
    </button>
  );
}

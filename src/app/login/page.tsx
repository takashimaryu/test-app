import { Suspense } from "react";
import { headers } from "next/headers";
import { getLineOAuthRedirectUriForLoginPage } from "@/lib/line/redirect-base";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  const h = await headers();
  const serverLineCallbackUrl = getLineOAuthRedirectUriForLoginPage(h);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center p-10 text-neutral-500 dark:text-neutral-400">
          読み込み中…
        </div>
      }
    >
      <LoginClient serverLineCallbackUrl={serverLineCallbackUrl} />
    </Suspense>
  );
}
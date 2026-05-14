import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * `/_next/` 配下（CSS・JS・RSC の data など）は必ず素通し。
     * `_next/data` だけ除外漏れすると、環境によってはフライトやスタイルが壊れ「CSS 無しの HTML」に見える。
     */
    "/((?!_next/|_next$).*)",
  ],
};

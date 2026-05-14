"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/** 打刻後のリダイレクト先に付く `?a=...` のとき、RSC の固着を避けるため 1 回だけ再フェッチする */
const POST_ACTION = new Set(["in", "out", "undo_in", "undo_out", "clear_day", "edit"]);

export function AttendanceRscRefresh() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lastRefreshed = useRef<string | null>(null);

  useEffect(() => {
    const a = searchParams.get("a");
    if (!a || !POST_ACTION.has(a)) {
      return;
    }
    const key = searchParams.toString();
    if (lastRefreshed.current === key) {
      return;
    }
    lastRefreshed.current = key;
    router.refresh();
  }, [router, searchParams]);

  return null;
}

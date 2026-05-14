"use client";

import { useEffect, useState } from "react";

const TZ = "Asia/Tokyo";

/**
 * 出退勤カード用：日本時間の「今日の日付」と現在時刻（時・分のみ）を横並び。分が変わるタイミングで合わせるため 1 秒ごとに更新。
 */
export function AttendanceJstClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateStr = now.toLocaleDateString("ja-JP", {
    timeZone: TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const timeStr = new Intl.DateTimeFormat("ja-JP", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);

  return (
    <div className="mt-2 flex flex-row flex-wrap items-baseline gap-2 sm:gap-3">
      <p className="text-base font-medium text-neutral-800 dark:text-neutral-200">{dateStr}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-wide text-neutral-900 dark:text-neutral-50">
        {timeStr}
      </p>
    </div>
  );
}

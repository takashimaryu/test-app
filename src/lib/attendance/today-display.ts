export type TodayAttendanceRow = {
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
} | null;

export function formatJstTime(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

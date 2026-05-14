const JST = "Asia/Tokyo";
const JST_OFFSET = "+09:00";

/**
 * 現在時刻を JST の暦日で `YYYY-MM-DD` にする（出勤の「営業日」キー）。
 */
export function jstCalendarDateIso(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: JST });
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/**
 * ISO 時刻を JST で見た `HH:mm`（`input type="time"` 用）。
 */
export function isoToJstTimeHm(iso: string): string {
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = part(p, "hour").padStart(2, "0");
  const mi = part(p, "minute").padStart(2, "0");
  return `${h}:${mi}`;
}

function normalizeTimeHm(raw: string): string | null {
  const t = raw.trim();
  const m = /^(\d{1,2}):(\d{2})$/u.exec(t);
  if (!m) {
    return null;
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * 暦日 `YYYY-MM-DD`（JST の営業日）と `HH:mm`（JST）から UTC の ISO 文字列を得る。
 */
export function parseJstTimeHmOnWorkDate(workDate: string, timeHm: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(workDate)) {
    return null;
  }
  const hm = normalizeTimeHm(timeHm);
  if (!hm) {
    return null;
  }
  const ms = Date.parse(`${workDate}T${hm}${JST_OFFSET}`);
  if (Number.isNaN(ms)) {
    return null;
  }
  return new Date(ms).toISOString();
}

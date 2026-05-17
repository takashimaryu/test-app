import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeWorkTypesFromDb } from "@/lib/attendance/work-types";
import { normalizePhotoPathsFromDb, signedDailyReportPhotoUrls } from "@/lib/daily-report/photos";
import { ensureOwnProfile, isAdminProfile } from "@/lib/profiles";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ReportRow = {
  id: string;
  user_id: string;
  work_date: string;
  work_types: unknown;
  work_other: string | null;
  distance_km: number | string | null;
  toll_yen: number | null;
  notes: string | null;
  photo_paths: unknown;
  submitted_at: string | null;
};

function formatDate(v: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${v}T00:00:00+09:00`));
}

function formatDateTime(v: string | null): string {
  if (!v) {
    return "";
  }
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(v));
}

function formatOptionalNumber(v: number | string | null, unit: string): string {
  if (v === null || v === undefined || v === "") {
    return "-";
  }
  return `${String(v)}${unit}`;
}

function userDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  const name =
    typeof meta.name === "string"
      ? meta.name
      : typeof meta.full_name === "string"
        ? meta.full_name
        : typeof meta.preferred_username === "string"
          ? meta.preferred_username
          : "";
  return name || user.email || "不明なユーザー";
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  noStore();

  const sessionSupabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const profile = await ensureOwnProfile(sessionSupabase, user);
  if (!isAdminProfile(profile)) {
    redirect("/employee");
  }

  const adminSupabase = createAdminSupabaseClient();

  if (!adminSupabase) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-10">
          <header className="space-y-2">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">管理画面</p>
            <h1 className="text-3xl font-semibold leading-tight">日報管理</h1>
          </header>
          <p
            className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-50"
            role="alert"
          >
            管理ページを表示するには、サーバー環境変数{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900">
              SUPABASE_SERVICE_ROLE_KEY
            </code>{" "}
            を設定してください。
          </p>
          <Link href="/employee" className="text-sm text-neutral-500 underline underline-offset-4">
            マイページへ戻る
          </Link>
        </main>
      </div>
    );
  }

  const { data, error } = await adminSupabase
    .from("daily_report")
    .select(
      "id, user_id, work_date, work_types, work_other, distance_km, toll_yen, notes, photo_paths, submitted_at",
    )
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as ReportRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const users = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await adminSupabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);
    for (const p of profiles ?? []) {
      if (typeof p.display_name === "string" && p.display_name.trim()) {
        users.set(p.user_id as string, p.display_name.trim());
      }
    }
  }
  await Promise.all(
    userIds.map(async (id) => {
      if (users.has(id)) {
        return;
      }
      const { data: userData } = await adminSupabase.auth.admin.getUserById(id);
      if (userData.user) {
        users.set(
          id,
          userDisplayName({
            email: userData.user.email,
            user_metadata: userData.user.user_metadata,
          }),
        );
      }
    }),
  );

  const reports = await Promise.all(
    rows.map(async (row) => {
      const photoPaths = normalizePhotoPathsFromDb(row.photo_paths);
      return {
        ...row,
        workTypes: normalizeWorkTypesFromDb(row.work_types),
        photoPaths,
        photos: await signedDailyReportPhotoUrls(adminSupabase, photoPaths),
      };
    }),
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-10">
        <header className="space-y-2">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">管理画面</p>
          <h1 className="text-3xl font-semibold leading-tight">送信済み日報</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            従業員が「日報を送信」した日報だけを表示します。
          </p>
        </header>

        {error ? (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-50"
            role="alert"
          >
            送信済み日報を読み込めませんでした。migration と service role key を確認してください。
          </p>
        ) : null}

        {!error && reports.length === 0 ? (
          <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            送信済みの日報はまだありません。
          </p>
        ) : null}

        <div className="space-y-4">
          {reports.map((r) => (
            <article
              key={r.id}
              className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-5 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    {formatDate(r.work_date)}
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    {users.get(r.user_id) ?? r.user_id}
                  </p>
                </div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  送信: {formatDateTime(r.submitted_at)}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="font-medium text-neutral-500 dark:text-neutral-400">作業内容</dt>
                  <dd className="mt-1 text-neutral-900 dark:text-neutral-50">
                    {r.workTypes.length > 0 ? r.workTypes.join("、") : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-500 dark:text-neutral-400">写真</dt>
                  <dd className="mt-1 text-neutral-900 dark:text-neutral-50">
                    {r.photoPaths.length}枚
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-500 dark:text-neutral-400">移動距離</dt>
                  <dd className="mt-1 text-neutral-900 dark:text-neutral-50">
                    {formatOptionalNumber(r.distance_km, "km")}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-neutral-500 dark:text-neutral-400">高速料金</dt>
                  <dd className="mt-1 text-neutral-900 dark:text-neutral-50">
                    {formatOptionalNumber(r.toll_yen, "円")}
                  </dd>
                </div>
              </dl>

              {r.work_other ? (
                <section>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    その他の内容
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-50">
                    {r.work_other}
                  </p>
                </section>
              ) : null}

              {r.notes ? (
                <section>
                  <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    連絡事項
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-50">
                    {r.notes}
                  </p>
                </section>
              ) : null}

              {r.photos.length > 0 ? (
                <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {r.photos.map((p) => (
                    <li key={p.path}>
                      <a
                        href={p.signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-200 dark:border-neutral-600 dark:bg-neutral-800"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.signedUrl} alt="" className="size-full object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <Link
          href="/employee"
          className="text-center text-sm text-neutral-500 underline underline-offset-4 dark:text-neutral-400"
        >
          マイページへ戻る
        </Link>
      </main>
    </div>
  );
}

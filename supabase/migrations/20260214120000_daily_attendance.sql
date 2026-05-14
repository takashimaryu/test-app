-- 1 ユーザー 1 暦日（Asia/Tokyo）につき 1 行。出勤時に insert、退勤時に clock_out_at を更新。
-- Supabase SQL Editor でこのファイル全文を実行するか、CLI で migrate してください。

create table if not exists public.daily_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null,
  clock_in_at timestamptz not null,
  clock_out_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_attendance_one_per_user_day unique (user_id, work_date)
);

create index if not exists daily_attendance_user_date_idx
  on public.daily_attendance (user_id, work_date desc);

alter table public.daily_attendance enable row level security;

drop policy if exists "daily_attendance_select_own" on public.daily_attendance;
drop policy if exists "daily_attendance_insert_own" on public.daily_attendance;
drop policy if exists "daily_attendance_update_own" on public.daily_attendance;

create policy "daily_attendance_select_own"
  on public.daily_attendance
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "daily_attendance_insert_own"
  on public.daily_attendance
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "daily_attendance_update_own"
  on public.daily_attendance
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_attendance_delete_own" on public.daily_attendance;

create policy "daily_attendance_delete_own"
  on public.daily_attendance
  for delete
  to authenticated
  using (auth.uid() = user_id);

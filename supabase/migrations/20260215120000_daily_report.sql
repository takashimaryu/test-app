-- 従業員の「今日の日報」（JST の暦日 1 ユーザー 1 行）。出退勤と同じ work_date 軸。

create table if not exists public.daily_report (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  work_date date not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_report_one_per_user_day unique (user_id, work_date)
);

create index if not exists daily_report_user_date_idx
  on public.daily_report (user_id, work_date desc);

alter table public.daily_report enable row level security;

drop policy if exists "daily_report_select_own" on public.daily_report;
drop policy if exists "daily_report_insert_own" on public.daily_report;
drop policy if exists "daily_report_update_own" on public.daily_report;
drop policy if exists "daily_report_delete_own" on public.daily_report;

create policy "daily_report_select_own"
  on public.daily_report
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "daily_report_insert_own"
  on public.daily_report
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "daily_report_update_own"
  on public.daily_report
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_report_delete_own"
  on public.daily_report
  for delete
  to authenticated
  using (auth.uid() = user_id);

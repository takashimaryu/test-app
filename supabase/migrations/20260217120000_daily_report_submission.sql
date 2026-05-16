-- 日報の「送信済み」状態。送信後に管理画面で確認するためのメタデータ。

alter table public.daily_report
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references auth.users (id) on delete set null;

create index if not exists daily_report_submitted_at_idx
  on public.daily_report (submitted_at desc)
  where submitted_at is not null;

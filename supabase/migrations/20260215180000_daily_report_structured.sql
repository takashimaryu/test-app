-- 旧スキーマ（body のみ）からの移行。新規は 20260215120000 で構造化済みのため、多くの環境では no-op に近い。

alter table public.daily_report add column if not exists work_content text not null default '';
alter table public.daily_report add column if not exists distance_km numeric(12, 2);
alter table public.daily_report add column if not exists toll_yen integer;
alter table public.daily_report add column if not exists notes text not null default '';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_report'
      and column_name = 'body'
  ) then
    execute $m$
      update public.daily_report
      set work_content = body
      where coalesce(trim(work_content), '') = ''
        and coalesce(trim(body), '') <> ''
    $m$;
  end if;
end $$;

alter table public.daily_report drop column if exists body;

alter table public.daily_report drop constraint if exists daily_report_distance_nonneg;
alter table public.daily_report
  add constraint daily_report_distance_nonneg check (distance_km is null or distance_km >= 0);

alter table public.daily_report drop constraint if exists daily_report_toll_nonneg;
alter table public.daily_report
  add constraint daily_report_toll_nonneg check (toll_yen is null or toll_yen >= 0);

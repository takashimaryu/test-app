-- 旧スキーマ（body のみ）や列不足の補完。work_content 列は作らない（現行は work_type / work_other）。

alter table public.daily_report add column if not exists work_type text not null default '';
alter table public.daily_report add column if not exists work_other text not null default '';
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
      set work_type = 'その他',
          work_other = trim(body::text)
      where coalesce(trim(body::text), '') <> ''
    $m$;
    alter table public.daily_report drop column body;
  end if;
end $$;

alter table public.daily_report drop constraint if exists daily_report_distance_nonneg;
alter table public.daily_report
  add constraint daily_report_distance_nonneg check (distance_km is null or distance_km >= 0);

alter table public.daily_report drop constraint if exists daily_report_toll_nonneg;
alter table public.daily_report
  add constraint daily_report_toll_nonneg check (toll_yen is null or toll_yen >= 0);

alter table public.daily_report drop constraint if exists daily_report_work_type_allowed;
alter table public.daily_report
  add constraint daily_report_work_type_allowed check (
    work_type = ''
    or work_type in ('誘導', '立会い', '投入', '試験', '荷揚げ', '警備', 'その他')
  );

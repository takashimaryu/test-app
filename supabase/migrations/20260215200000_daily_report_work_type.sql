-- 旧 work_content 列がある場合のみ移行（work_types + work_other）

alter table public.daily_report add column if not exists work_types text[] not null default '{}';
alter table public.daily_report add column if not exists work_other text not null default '';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_report'
      and column_name = 'work_content'
  ) then
    execute $m$
      update public.daily_report
      set work_types = array['その他']::text[],
          work_other = case
            when coalesce(trim(work_other), '') <> '' then trim(work_other)
            else trim(work_content)
          end
      where coalesce(trim(work_content), '') <> ''
    $m$;
    alter table public.daily_report drop column work_content;
  end if;
end $$;

alter table public.daily_report drop constraint if exists daily_report_work_type_allowed;

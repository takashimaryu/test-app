-- 作業内容を複数選択可能にする（work_types text[]）。単一の work_type は廃止。

alter table public.daily_report add column if not exists work_types text[] not null default '{}';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_report'
      and column_name = 'work_type'
  ) then
    execute $m$
      update public.daily_report
      set work_types = case
        when coalesce(nullif(trim(work_type), ''), '') = '' then '{}'::text[]
        else array[trim(work_type)]::text[]
      end
    $m$;
    alter table public.daily_report drop constraint if exists daily_report_work_type_allowed;
    alter table public.daily_report drop column work_type;
  end if;
end $$;

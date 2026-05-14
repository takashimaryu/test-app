-- 作業内容を選択式（work_type）+「その他」用自由記述（work_other）へ

alter table public.daily_report add column if not exists work_type text not null default '';
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
      set work_type = 'その他',
          work_other = trim(work_content)
      where coalesce(trim(work_content), '') <> ''
    $m$;
    alter table public.daily_report drop column work_content;
  end if;
end $$;

alter table public.daily_report drop constraint if exists daily_report_work_type_allowed;
alter table public.daily_report
  add constraint daily_report_work_type_allowed check (
    work_type = ''
    or work_type in ('誘導', '立会い', '投入', '試験', '荷揚げ', '警備', 'その他')
  );

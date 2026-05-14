-- 日報に写真（Storage パス配列）。バケット `daily_report_photos` は非公開。オブジェクトキー: {user_id}/{work_date}/{uuid}.{ext}

alter table public.daily_report
  add column if not exists photo_paths text[] not null default '{}';

-- バケット（5MB 上限・画像のみ。既存なら上限だけ更新）
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'daily_report_photos',
  'daily_report_photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "daily_report_photos_select_own" on storage.objects;
drop policy if exists "daily_report_photos_insert_own" on storage.objects;
drop policy if exists "daily_report_photos_update_own" on storage.objects;
drop policy if exists "daily_report_photos_delete_own" on storage.objects;

create policy "daily_report_photos_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'daily_report_photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "daily_report_photos_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'daily_report_photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "daily_report_photos_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'daily_report_photos'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'daily_report_photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "daily_report_photos_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'daily_report_photos'
    and split_part(name, '/', 1) = auth.uid()::text
  );

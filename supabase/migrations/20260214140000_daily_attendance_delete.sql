-- 出勤取り消し（未退勤の行を delete）用。既に 20260214120000 を実行済みのプロジェクトはこのファイルだけ SQL Editor で実行してください。

drop policy if exists "daily_attendance_delete_own" on public.daily_attendance;

create policy "daily_attendance_delete_own"
  on public.daily_attendance
  for delete
  to authenticated
  using (auth.uid() = user_id);

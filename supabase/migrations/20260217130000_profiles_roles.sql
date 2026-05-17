-- 従業員プロフィールと管理権限。
-- LINE ログインの user_id を主キーにし、将来 ID/パスワード認証へ移る場合も従業員マスターとして使う。

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('employee', 'admin'))
);

create index if not exists profiles_role_idx
  on public.profiles (role);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own_employee" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 本人の初回ログイン時だけ自分の profile を作れる。role は employee に固定。
create policy "profiles_insert_own_employee"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id and role = 'employee');

-- 本人は表示名だけ更新できる。role / is_active は管理側（service role）だけが変更する。
revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

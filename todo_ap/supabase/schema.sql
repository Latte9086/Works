-- Supabase Schema for Gemini-Powered Realtime TODO App

-- 1. Create table
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('大学', 'サークル', '個人')),
  due_date text, -- '今日', '明日', 'YYYY-MM-DD', 'YYYY-MM-DD HH:mm'
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable Supabase Realtime
alter publication supabase_realtime add table todos;

-- 3. Row Level Security (RLS)
alter table todos enable row level security;

-- Allow anonymous read, insert, update, and delete for demo/local usage
create policy "Allow all operations for anon"
  on todos
  for all
  using (true)
  with check (true);

-- 4. Initial sample data (Optional)
insert into todos (title, category, due_date, is_completed)
values
  ('線形代数の期末レポート作成', '大学', '明日', false),
  ('春学期サークル新歓ビラ作成', 'サークル', '今日', false),
  ('常備薬と目薬を購入する', '個人', null, false);

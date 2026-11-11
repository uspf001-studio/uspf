-- Run in Supabase SQL Editor. Enable RLS before using production data.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category text not null default 'News',
  summary text default '',
  body text default '',
  cover_image text,
  media jsonb not null default '[]'::jsonb,
  video_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;
create policy "Public can read published posts" on public.posts
for select using (status = 'published');
create policy "Authenticated admins can read all posts" on public.posts
for select to authenticated using (true);
create policy "Authenticated admins can insert posts" on public.posts
for insert to authenticated with check (true);
create policy "Authenticated admins can update posts" on public.posts
for update to authenticated using (true) with check (true);
create policy "Authenticated admins can delete posts" on public.posts
for delete to authenticated using (true);

create table if not exists public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  institution text,
  role text,
  district text,
  mobile text not null,
  email text,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.membership_applications enable row level security;
create policy "Public can submit membership applications" on public.membership_applications
for insert to anon, authenticated with check (true);
create policy "Admins can view membership applications" on public.membership_applications
for select to authenticated using (true);

-- IMPORTANT: For a production deployment, create an admin allowlist table
-- and restrict authenticated policies to approved owner/admin user IDs.
-- Do not assume every authenticated account should have administrator access.

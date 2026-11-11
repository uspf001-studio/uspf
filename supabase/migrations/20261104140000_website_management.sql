create table if not exists public.website_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  primary_color text not null default '#101f3c',
  secondary_color text not null default '#c7a45a',
  background_color text not null default '#ffffff',
  text_color text not null default '#182235',
  header_color text not null default '#101f3c',
  footer_color text not null default '#0b172c',
  button_color text not null default '#c7a45a',
  font_family text not null default 'DM Sans'
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.announcement_lines (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link_url text,
  background_color text not null default '#101f3c',
  text_color text not null default '#ffffff',
  is_active boolean not null default true,
  display_order integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  tag text not null default 'USPF / OUR MISSION',
  heading text not null,
  accent_heading text not null default '',
  description text not null default '',
  image_url text not null,
  button_text text not null default 'EXPLORE OUR MISSION',
  button_url text not null default '/',
  is_visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.homepage_slides
  (tag, heading, accent_heading, description, image_url, button_text, button_url, display_order)
select initial_slides.*
from (values
  ('PILLAR 01 / TEACHERS PROTECTION', 'Respect the teachers.', 'Protect their rights.',
   'Championing teacher dignity, professional security and fair grievance processes across the education ecosystem.',
   'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=2200&q=85',
   'EXPLORE OUR MISSION', '/teachers-protection', 1),
  ('PILLAR 02 / SCHOOL SAFETY', 'Safe schools.', 'Stronger education.',
   'Promoting institutional safety, transparent procedures and a fair environment for educational institutions.',
   'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=2200&q=85',
   'EXPLORE OUR MISSION', '/school-safety', 2),
  ('PILLAR 03 / CHILD PROTECTION', 'Every child deserves', 'a safe future.',
   'Supporting child dignity, well-being and safe, inclusive learning environments for every student.',
   'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2200&q=85',
   'EXPLORE OUR MISSION', '/child-protection', 3)
) as initial_slides(tag, heading, accent_heading, description, image_url, button_text, button_url, display_order)
where not exists (select 1 from public.homepage_slides);

create or replace function public.is_website_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.website_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_website_admin() from public;
grant execute on function public.is_website_admin() to authenticated;

alter table public.website_admins enable row level security;
alter table public.site_settings enable row level security;
alter table public.announcement_lines enable row level security;
alter table public.homepage_slides enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('website_admins', 'site_settings', 'announcement_lines', 'homepage_slides')
  loop
    execute format(
      'drop policy %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

create policy "Approved administrators can verify their own access"
on public.website_admins
for select to authenticated
using (user_id = (select auth.uid()));

create policy "Public can read website theme"
on public.site_settings
for select to anon, authenticated
using (id = 1);
create policy "Approved administrators can manage website theme"
on public.site_settings
for all to authenticated
using ((select public.is_website_admin()))
with check ((select public.is_website_admin()));

create policy "Public can read scheduled announcements"
on public.announcement_lines
for select to anon, authenticated
using (
  is_active
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now())
);
create policy "Approved administrators can manage announcements"
on public.announcement_lines
for all to authenticated
using ((select public.is_website_admin()))
with check ((select public.is_website_admin()));

create policy "Public can read visible homepage slides"
on public.homepage_slides
for select to anon, authenticated
using (is_visible);
create policy "Approved administrators can manage homepage slides"
on public.homepage_slides
for all to authenticated
using ((select public.is_website_admin()))
with check ((select public.is_website_admin()));

-- Remove the starter schema's authenticated-user-wide policies before enforcing the allowlist.
do $$
declare
  policy_record record;
begin
  if to_regclass('public.posts') is not null then
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'posts'
    loop
      execute format('drop policy %I on public.posts', policy_record.policyname);
    end loop;

    alter table public.posts enable row level security;
    create policy "Public can read published posts"
      on public.posts for select to anon, authenticated
      using (status = 'published');
    create policy "Approved administrators can manage posts"
      on public.posts for all to authenticated
      using ((select public.is_website_admin()))
      with check ((select public.is_website_admin()));
  end if;

  if to_regclass('public.membership_applications') is not null then
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'membership_applications'
        and cmd in ('ALL', 'SELECT')
    loop
      execute format('drop policy %I on public.membership_applications', policy_record.policyname);
    end loop;

    alter table public.membership_applications enable row level security;
    create policy "Approved administrators can view membership applications"
      on public.membership_applications for select to authenticated
      using ((select public.is_website_admin()));
  end if;
end;
$$;

-- Replace any broad media write policies while preserving existing read policies.
do $$
declare
  policy_record record;
begin
  if to_regclass('public.media') is not null then
    for policy_record in
      select policyname, cmd
      from pg_policies
      where schemaname = 'public' and tablename = 'media'
        and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    loop
      execute format('drop policy %I on public.media', policy_record.policyname);
    end loop;

    alter table public.media enable row level security;
    create policy "Approved administrators can manage media"
      on public.media for all to authenticated
      using ((select public.is_website_admin()))
      with check ((select public.is_website_admin()));
  end if;
end;
$$;

revoke all on table public.website_admins from public, anon, authenticated;
grant select (user_id) on public.website_admins to authenticated;

revoke all on table public.site_settings from public, anon, authenticated;
grant select (
  id, primary_color, secondary_color, background_color, text_color,
  header_color, footer_color, button_color, font_family
) on public.site_settings to anon, authenticated;
grant insert (
  id, primary_color, secondary_color, background_color, text_color,
  header_color, footer_color, button_color, font_family
) on public.site_settings to authenticated;
grant update (
  primary_color, secondary_color, background_color, text_color,
  header_color, footer_color, button_color, font_family
) on public.site_settings to authenticated;

revoke all on table public.announcement_lines from public, anon, authenticated;
grant select (
  id, message, link_url, background_color, text_color, is_active,
  display_order, starts_at, ends_at
) on public.announcement_lines to anon, authenticated;
grant insert (
  message, link_url, background_color, text_color, is_active,
  display_order, starts_at, ends_at
) on public.announcement_lines to authenticated;
grant update (
  message, link_url, background_color, text_color, is_active,
  display_order, starts_at, ends_at
) on public.announcement_lines to authenticated;
grant delete on public.announcement_lines to authenticated;

revoke all on table public.homepage_slides from public, anon, authenticated;
grant select (
  id, tag, heading, accent_heading, description, image_url,
  button_text, button_url, display_order
) on public.homepage_slides to anon;
grant select (
  id, tag, heading, accent_heading, description, image_url,
  button_text, button_url, is_visible, display_order, created_at
) on public.homepage_slides to authenticated;
grant insert (
  tag, heading, accent_heading, description, image_url, button_text,
  button_url, is_visible, display_order
) on public.homepage_slides to authenticated;
grant update (
  tag, heading, accent_heading, description, image_url, button_text,
  button_url, is_visible, display_order
) on public.homepage_slides to authenticated;
grant delete on public.homepage_slides to authenticated;

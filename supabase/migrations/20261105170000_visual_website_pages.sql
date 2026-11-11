create table public.website_pages (
  slug text primary key check (slug in (
    'about',
    'news',
    'membership',
    'president',
    'teachers-protection',
    'school-safety',
    'child-protection'
  )),
  label text not null check (length(btrim(label)) between 1 and 80),
  eyebrow text not null default '',
  title text not null check (length(btrim(title)) between 1 and 180),
  subtitle text not null default '',
  introduction text not null default '',
  hero_image_url text,
  is_published boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (hero_image_url is null or hero_image_url ~* '^https?://[^[:space:]]+$')
);

create table public.website_page_sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text not null references public.website_pages(slug) on delete cascade,
  title text not null default '',
  body text not null default '',
  image_url text,
  button_label text,
  button_url text,
  display_order integer not null default 0 check (display_order >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((button_label is null) = (button_url is null)),
  check (
    button_url is null
    or (button_url like '/%' and button_url not like '//%')
    or button_url ~* '^https?://[^[:space:]]+$'
  ),
  check (image_url is null or image_url ~* '^https?://[^[:space:]]+$')
);

create index website_page_sections_order_idx
  on public.website_page_sections (page_slug, is_visible, display_order, created_at);

alter table public.website_pages enable row level security;
alter table public.website_page_sections enable row level security;

revoke all on public.website_pages from public, anon, authenticated;
grant select (slug, label, eyebrow, title, subtitle, introduction, hero_image_url, is_published, updated_at)
  on public.website_pages to anon, authenticated;
grant insert (slug, label, eyebrow, title, subtitle, introduction, hero_image_url, is_published, updated_by)
  on public.website_pages to authenticated;
grant update (label, eyebrow, title, subtitle, introduction, hero_image_url, is_published, updated_at, updated_by)
  on public.website_pages to authenticated;
grant delete on public.website_pages to authenticated;

revoke all on public.website_page_sections from public, anon, authenticated;
grant select (id, page_slug, title, body, image_url, button_label, button_url, display_order, is_visible, created_at, updated_at)
  on public.website_page_sections to anon, authenticated;
grant insert (page_slug, title, body, image_url, button_label, button_url, display_order, is_visible, updated_at)
  on public.website_page_sections to authenticated;
grant update (title, body, image_url, button_label, button_url, display_order, is_visible, updated_at)
  on public.website_page_sections to authenticated;
grant delete on public.website_page_sections to authenticated;

create policy "Public can read published website pages"
  on public.website_pages for select to anon, authenticated
  using (is_published);
create policy "Approved administrators manage website pages"
  on public.website_pages for all to authenticated
  using ((select public.is_website_admin()))
  with check ((select public.is_website_admin()));

create policy "Public can read sections of published pages"
  on public.website_page_sections for select to anon, authenticated
  using (
    is_visible and exists (
      select 1 from public.website_pages p
      where p.slug = page_slug and p.is_published
    )
  );
create policy "Approved administrators manage website page sections"
  on public.website_page_sections for all to authenticated
  using ((select public.is_website_admin()))
  with check ((select public.is_website_admin()));

insert into public.website_pages
  (slug, label, eyebrow, title, subtitle, introduction, is_published)
values
  ('about', 'About', 'ABOUT USPF', 'A united voice for education', 'Protecting educators. Strengthening institutions. Safeguarding children.',
   'United Schools Protection Forum brings educational stakeholders together to promote dignity, safety, fairness and responsible progress throughout the school ecosystem.', true),
  ('news', 'News & Media', 'USPF / NEWSROOM', 'News & Media', 'Updates and information from USPF.',
   'Browse updates published by USPF. Only articles approved for publication are displayed.', true),
  ('membership', 'Membership', 'BECOME A MEMBER', 'Stronger together for education', 'Connect with USPF and contribute to a safer, fairer education ecosystem.',
   'Learn more about USPF membership and connect with the forum to express your interest.', true),
  ('president', 'President''s Desk', 'LEADERSHIP', 'President''s Desk', 'A message from USPF leadership.',
   'This page is managed by the USPF website administrator. Official leadership content can be added here.', true),
  ('teachers-protection', 'Teacher Protection', 'OUR PILLARS / 01', 'Teacher Protection', 'Protecting those who shape tomorrow.',
   'Promoting teacher dignity, professional rights, fair grievance mechanisms and respectful working environments.', true),
  ('school-safety', 'School Safety', 'OUR PILLARS / 02', 'School Safety', 'Protecting educational institutions.',
   'Advocating institutional safety, transparent regulatory procedures, lawful inspections and administrative fairness.', true),
  ('child-protection', 'Child Protection', 'OUR PILLARS / 03', 'Child Protection', 'Every child matters.',
   'Encouraging safe learning environments, child dignity, prevention awareness and cooperation with families.', true)
on conflict (slug) do nothing;

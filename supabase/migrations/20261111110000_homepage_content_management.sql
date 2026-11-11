create table public.homepage_content (
  id smallint primary key check (id = 1),
  content jsonb not null default '{}'::jsonb
    check (jsonb_typeof(content) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.homepage_content enable row level security;

revoke all on public.homepage_content from public, anon, authenticated;
grant select (id, content, updated_at)
  on public.homepage_content to anon, authenticated;
grant insert (id, content, updated_at)
  on public.homepage_content to authenticated;
grant update (content, updated_at)
  on public.homepage_content to authenticated;

create policy "Public can read homepage content"
  on public.homepage_content for select to anon, authenticated
  using (id = 1);
create policy "Approved administrators manage homepage content"
  on public.homepage_content for all to authenticated
  using ((select public.is_website_admin()))
  with check ((select public.is_website_admin()));

update public.homepage_slides
set
  tag = 'Pillar 01 · Our first priority',
  heading = 'Safe Schools.',
  accent_heading = 'Stronger Education.',
  description = 'Protecting institutional dignity, advocating for transparent governance, and promoting safe, responsibly managed educational environments.',
  button_text = 'Explore School Protection →',
  button_url = '/#advocacy'
where tag = 'PILLAR 02 / SCHOOL SAFETY'
  and heading = 'Safe schools.'
  and accent_heading = 'Stronger education.';

update public.homepage_slides
set
  tag = 'Pillar 02 · Professional dignity',
  heading = 'Respect Teachers.',
  accent_heading = 'Protect Their Rights.',
  description = 'Standing for teachers'' dignity, fair treatment, professional security and respectful working environments.',
  button_text = 'Explore Teacher Protection →',
  button_url = '/#mission'
where tag = 'PILLAR 01 / TEACHERS PROTECTION'
  and heading = 'Respect the teachers.'
  and accent_heading = 'Protect their rights.';

update public.homepage_slides
set
  tag = 'Pillar 03 · Every child matters',
  heading = 'Every Child Deserves',
  accent_heading = 'a Safe Future.',
  description = 'Advancing student well-being, child protection awareness, dignity and nurturing spaces for learning.',
  button_text = 'Discover Child Protection →',
  button_url = '/#mission'
where tag = 'PILLAR 03 / CHILD PROTECTION'
  and heading = 'Every child deserves'
  and accent_heading = 'a safe future.';

create table public.representations (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique check (length(btrim(reference_no)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 240),
  category text not null check (category in (
    'School Recognition',
    'School Safety',
    'Teacher Protection',
    'RTI-Related Concerns',
    'Single-Window Permissions',
    'GHMC NOC Issues',
    'Education Policy'
  )),
  submission_date date not null,
  department text not null check (length(btrim(department)) between 1 and 240),
  summary text not null check (length(btrim(summary)) > 0),
  recommendations text not null check (length(btrim(recommendations)) > 0),
  status text not null default 'Draft' check (status in (
    'Draft',
    'Submitted',
    'Under Consideration',
    'Response Received',
    'Resolved',
    'Closed'
  )),
  is_published boolean not null default false,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_published or status <> 'Draft')
);

create index representations_public_listing_idx
  on public.representations (submission_date desc, updated_at desc)
  where is_published;
create index representations_category_status_idx
  on public.representations (category, status);

create table public.representation_documents (
  id uuid primary key default gen_random_uuid(),
  representation_id uuid not null references public.representations(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (length(btrim(file_name)) between 1 and 255),
  is_public boolean not null default false,
  is_current boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index representation_documents_representation_idx
  on public.representation_documents (representation_id, is_current, created_at desc);

create table public.representation_updates (
  id uuid primary key default gen_random_uuid(),
  representation_id uuid not null references public.representations(id) on delete cascade,
  event_type text not null check (event_type in ('status', 'published', 'unpublished', 'follow_up')),
  status text check (status in (
    'Draft',
    'Submitted',
    'Under Consideration',
    'Response Received',
    'Resolved',
    'Closed'
  )),
  note text,
  is_public boolean not null default false,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (event_type = 'status' and status is not null)
    or (event_type <> 'status' and status is null)
  )
);

create index representation_updates_representation_idx
  on public.representation_updates (representation_id, created_at desc);

alter table public.representations enable row level security;
alter table public.representation_documents enable row level security;
alter table public.representation_updates enable row level security;

revoke all on table public.representations from public, anon, authenticated;
grant select (
  id, reference_no, slug, title, category, submission_date, department,
  summary, recommendations, status, is_published, published_at, created_at, updated_at
) on public.representations to anon, authenticated;
grant insert (
  reference_no, slug, title, category, submission_date, department, summary,
  recommendations, status, is_published, published_at, published_by, updated_at
) on public.representations to authenticated;
grant update (
  reference_no, slug, title, category, submission_date, department, summary,
  recommendations, status, is_published, published_at, published_by, updated_at
) on public.representations to authenticated;
grant delete on public.representations to authenticated;

revoke all on table public.representation_documents from public, anon, authenticated;
grant select (id, representation_id, storage_path, file_name, is_public, is_current, created_at)
  on public.representation_documents to anon, authenticated;
grant insert (representation_id, storage_path, file_name, is_public, is_current, uploaded_by)
  on public.representation_documents to authenticated;
grant update (is_public, is_current)
  on public.representation_documents to authenticated;
grant delete on public.representation_documents to authenticated;

revoke all on table public.representation_updates from public, anon, authenticated;
grant select (id, representation_id, event_type, status, note, is_public, created_at)
  on public.representation_updates to anon, authenticated;
grant insert (representation_id, event_type, status, note, is_public, changed_by)
  on public.representation_updates to authenticated;
grant delete on public.representation_updates to authenticated;

create policy "Public can read published representations"
  on public.representations for select to anon, authenticated
  using (is_published);
create policy "Approved administrators can manage representations"
  on public.representations for all to authenticated
  using ((select public.is_website_admin()))
  with check ((select public.is_website_admin()));

create policy "Public can read approved current representation documents"
  on public.representation_documents for select to anon, authenticated
  using (
    is_public and is_current and exists (
      select 1 from public.representations r
      where r.id = representation_id and r.is_published
    )
  );
create policy "Approved administrators can manage representation documents"
  on public.representation_documents for all to authenticated
  using ((select public.is_website_admin()))
  with check ((select public.is_website_admin()));

create policy "Public can read approved representation updates"
  on public.representation_updates for select to anon, authenticated
  using (
    is_public and exists (
      select 1 from public.representations r
      where r.id = representation_id and r.is_published
    )
  );
create policy "Approved administrators can manage representation updates"
  on public.representation_updates for all to authenticated
  using ((select public.is_website_admin()))
  with check ((select public.is_website_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('representation-documents', 'representation-documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Approved administrators manage representation PDF files"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'representation-documents'
    and (select public.is_website_admin())
  )
  with check (
    bucket_id = 'representation-documents'
    and (select public.is_website_admin())
  );

create policy "Public can access approved published representation PDFs"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'representation-documents'
    and exists (
      select 1
      from public.representation_documents d
      join public.representations r on r.id = d.representation_id
      where d.storage_path = name
        and d.is_public
        and d.is_current
        and r.is_published
    )
  );

-- Restrictive policies prevent unrelated broad storage policies from granting access to this private bucket.
create policy "Restrict representation PDF reads to approved records"
  on storage.objects as restrictive for select to authenticated
  using (
    bucket_id <> 'representation-documents'
    or (select public.is_website_admin())
    or exists (
      select 1
      from public.representation_documents d
      join public.representations r on r.id = d.representation_id
      where d.storage_path = name
        and d.is_public
        and d.is_current
        and r.is_published
    )
  );
create policy "Restrict anonymous representation PDF reads"
  on storage.objects as restrictive for select to anon
  using (
    bucket_id <> 'representation-documents'
    or exists (
      select 1
      from public.representation_documents d
      join public.representations r on r.id = d.representation_id
      where d.storage_path = name
        and d.is_public
        and d.is_current
        and r.is_published
    )
  );
create policy "Restrict representation PDF inserts to administrators"
  on storage.objects as restrictive for insert to authenticated
  with check (
    bucket_id <> 'representation-documents'
    or (select public.is_website_admin())
  );
create policy "Block anonymous representation PDF inserts"
  on storage.objects as restrictive for insert to anon
  with check (bucket_id <> 'representation-documents');
create policy "Restrict representation PDF updates to administrators"
  on storage.objects as restrictive for update to authenticated
  using (
    bucket_id <> 'representation-documents'
    or (select public.is_website_admin())
  )
  with check (
    bucket_id <> 'representation-documents'
    or (select public.is_website_admin())
  );
create policy "Block anonymous representation PDF updates"
  on storage.objects as restrictive for update to anon
  using (bucket_id <> 'representation-documents')
  with check (bucket_id <> 'representation-documents');
create policy "Restrict representation PDF deletes to administrators"
  on storage.objects as restrictive for delete to authenticated
  using (
    bucket_id <> 'representation-documents'
    or (select public.is_website_admin())
  );
create policy "Block anonymous representation PDF deletes"
  on storage.objects as restrictive for delete to anon
  using (bucket_id <> 'representation-documents');

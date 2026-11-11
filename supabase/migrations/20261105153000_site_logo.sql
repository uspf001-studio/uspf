alter table public.site_settings
  add column if not exists logo_url text;

grant select (logo_url) on public.site_settings to anon, authenticated;
grant insert (logo_url) on public.site_settings to authenticated;
grant update (logo_url) on public.site_settings to authenticated;

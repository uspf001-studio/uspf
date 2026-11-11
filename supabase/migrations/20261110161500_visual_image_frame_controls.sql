alter table public.website_pages
  add column hero_image_border_width integer not null default 10
  check (hero_image_border_width between 0 and 24);

alter table public.website_page_sections
  add column image_border_width integer not null default 12
  check (image_border_width between 0 and 24);

grant select (hero_image_border_width)
  on public.website_pages to anon, authenticated;
grant update (hero_image_border_width)
  on public.website_pages to authenticated;

grant select (image_border_width)
  on public.website_page_sections to anon, authenticated;
grant insert (image_border_width)
  on public.website_page_sections to authenticated;
grant update (image_border_width)
  on public.website_page_sections to authenticated;

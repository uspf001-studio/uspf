alter table public.homepage_slides
  add column frame_border_width integer not null default 12
  check (frame_border_width between 0 and 24),
  add column image_border_width integer not null default 10
  check (image_border_width between 0 and 24);

grant select (frame_border_width, image_border_width)
  on public.homepage_slides to anon, authenticated;
grant insert (frame_border_width, image_border_width)
  on public.homepage_slides to authenticated;
grant update (frame_border_width, image_border_width)
  on public.homepage_slides to authenticated;

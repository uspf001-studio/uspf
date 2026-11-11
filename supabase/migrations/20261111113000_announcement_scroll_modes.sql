alter table public.announcement_lines
  add column if not exists scroll_mode text not null default 'left';

alter table public.announcement_lines
  drop constraint if exists announcement_lines_scroll_mode_check;

alter table public.announcement_lines
  add constraint announcement_lines_scroll_mode_check
  check (scroll_mode in ('left', 'right', 'center'));

grant select (scroll_mode)
  on public.announcement_lines to anon, authenticated;
grant insert (scroll_mode)
  on public.announcement_lines to authenticated;
grant update (scroll_mode)
  on public.announcement_lines to authenticated;

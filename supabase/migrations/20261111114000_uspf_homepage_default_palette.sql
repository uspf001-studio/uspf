alter table public.site_settings
  alter column primary_color set default '#0c1c34',
  alter column secondary_color set default '#d4a853',
  alter column background_color set default '#ffffff',
  alter column text_color set default '#142338',
  alter column header_color set default '#0c1c34',
  alter column footer_color set default '#09182b',
  alter column button_color set default '#d4a853';

update public.site_settings
set
  primary_color = '#0c1c34',
  secondary_color = '#d4a853',
  background_color = '#ffffff',
  text_color = '#142338',
  header_color = '#0c1c34',
  footer_color = '#09182b',
  button_color = '#d4a853'
where id = 1
  and primary_color = '#101f3c'
  and secondary_color = '#c7a45a'
  and background_color = '#ffffff'
  and text_color = '#182235'
  and header_color = '#101f3c'
  and footer_color = '#0b172c'
  and button_color = '#c7a45a';

alter table public.announcement_lines
  alter column background_color set default '#0c1c34';

update public.announcement_lines
set background_color = '#0c1c34'
where background_color = '#101f3c';

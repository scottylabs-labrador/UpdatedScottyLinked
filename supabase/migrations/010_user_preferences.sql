-- Discoverability (Network search + discover), per-category notification opt-out, UI theme.

alter table public.users
  add column if not exists discoverable boolean not null default true;

alter table public.users
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

alter table public.users
  add column if not exists theme text not null default 'light';

alter table public.users drop constraint if exists users_theme_check;
alter table public.users
  add constraint users_theme_check check (theme in ('light', 'dark'));

comment on column public.users.discoverable is 'When false, user is omitted from Network discover list and search.';
comment on column public.users.notification_prefs is 'JSON map of category keys to boolean; false disables in-app notifications for that category.';
comment on column public.users.theme is 'Preferred UI theme: light or dark.';

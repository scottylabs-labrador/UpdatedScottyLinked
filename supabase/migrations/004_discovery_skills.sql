-- Discovery: structured skills on profiles.

alter table public.users
  add column if not exists skills text[] not null default '{}';

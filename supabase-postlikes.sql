-- Run this in Supabase SQL Editor if you don't have a postlikes table yet.
-- Likes are stored as one row per (post, user).

create table if not exists postlikes (
  postid bigint not null references posts(id) on delete cascade,
  userid bigint not null references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (postid, userid)
);

create index if not exists postlikes_postid_idx on postlikes(postid);
create index if not exists postlikes_userid_idx on postlikes(userid);

-- Optional: RLS (allow read to all, insert/delete for authenticated users)
-- alter table postlikes enable row level security;
-- create policy "Anyone can read likes" on postlikes for select using (true);
-- create policy "Users can manage own likes" on postlikes for all using (auth.uid() is not null);

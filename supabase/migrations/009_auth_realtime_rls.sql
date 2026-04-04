-- Link Supabase Auth to app users for client Realtime + RLS.
-- Enables SELECT on conversations, direct_messages, notifications for authenticated JWTs.

alter table public.users
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

create unique index if not exists users_auth_user_id_uidx on public.users (auth_user_id);

-- Conversations: participant only
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.auth_user_id = (select auth.uid())
        and (
          u.id = conversations.participant_low_id
          or u.id = conversations.participant_high_id
        )
    )
  );

-- DMs: participant in parent conversation
drop policy if exists "direct_messages_select_participant" on public.direct_messages;
create policy "direct_messages_select_participant"
  on public.direct_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      join public.users u on u.auth_user_id = (select auth.uid())
      where c.id = direct_messages.conversation_id
        and (
          u.id = c.participant_low_id
          or u.id = c.participant_high_id
        )
    )
  );

-- Notifications: own rows only
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.auth_user_id = (select auth.uid())
        and u.id = notifications.user_id
    )
  );

-- Realtime (idempotent: ignore if already member — run remaining statements manually if duplicate)
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.notifications;

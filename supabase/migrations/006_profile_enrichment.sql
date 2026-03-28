-- Richer student profiles: academics, links, affiliations
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS minors text,
  ADD COLUMN IF NOT EXISTS degree text,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS github_url text,
  ADD COLUMN IF NOT EXISTS portfolio_url text,
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS campus_roles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS organizations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.users.minors IS 'Free text or comma-separated minors';
COMMENT ON COLUMN public.users.organizations IS 'JSON array of {name, role?}';

-- Create Storage bucket `profile-media` (public) in Supabase Dashboard if uploads are enabled,
-- or run: insert into storage.buckets (id, name, public) values ('profile-media', 'profile-media', true) on conflict do nothing;

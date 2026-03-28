This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Authentication (Login with Google)

The app supports **Login with Google** restricted to **@andrew.cmu.edu** emails. Session is stored in cookies (via Supabase Auth). On first sign-in with an unseen email, a new row is created in the `users` table.

### Setup

1. **Supabase**
   - In the [Supabase Dashboard](https://supabase.com/dashboard): Authentication → Providers → enable **Google**, and add your Google OAuth Client ID and Secret (from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)).
   - Under Authentication → URL Configuration, set **Site URL** and add **Redirect URLs** (e.g. `http://localhost:3000/auth/callback` and your production URL).

2. **Environment**
   - Ensure `.env.local` has:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (for creating users in the callback)
     - `NEXT_PUBLIC_APP_URL` — base URL of the app (e.g. `http://localhost:3000` or `https://yourdomain.com`). **Must appear** in Supabase Redirect URLs (no trailing slash). On Vercel, if this is unset at build time, the app falls back to `https://$VERCEL_URL` so preview and production URLs work; set `NEXT_PUBLIC_APP_URL` explicitly for a custom domain.

3. **Database**
   - The `users` table must have at least: `id`, `handle`, `fullName`, `photoURL`, `bannerURL`, `major`, `year`, `bio`, `created_at`, `updated_at`. `handle` should be unique (e.g. andrew id). New users are inserted with `handle` derived from the email (e.g. `user@andrew.cmu.edu` → `user`).
   - **In-app notifications** (connection requests, accepts, comments): run the SQL in [`supabase/migrations/001_notifications.sql`](supabase/migrations/001_notifications.sql) in the Supabase SQL editor. Without this table, those features no-op gracefully.
   - **Project interest** (in-app “express interest” on listings): run [`supabase/migrations/002_project_interests.sql`](supabase/migrations/002_project_interests.sql). Without it, interest APIs return errors until the table exists.
   - **Trust & moderation** (reports, blocks, moderator flag): run [`supabase/migrations/003_trust_moderation.sql`](supabase/migrations/003_trust_moderation.sql). Adds `users.is_moderator`, `reports`, and `blocks`. Assign moderators in SQL, e.g. `update users set is_moderator = true where handle = 'yourhandle';`, or set comma-separated **Andrew** handles in `MODERATOR_HANDLES` for bootstrap until DB flags are set.
   - **Discovery (skills)**: run [`supabase/migrations/004_discovery_skills.sql`](supabase/migrations/004_discovery_skills.sql) for `users.skills` (`text[]`).
   - **Direct messaging**: run [`supabase/migrations/005_messaging.sql`](supabase/migrations/005_messaging.sql) for `conversations` and `direct_messages`.
   - **Profile enrichment** (minors, degree, college, social links, campus roles, organizations): run [`supabase/migrations/006_profile_enrichment.sql`](supabase/migrations/006_profile_enrichment.sql). For **avatar/banner uploads**, create a public Storage bucket named `profile-media` in the Supabase Dashboard (or run `insert into storage.buckets (id, name, public) values ('profile-media', 'profile-media', true) on conflict (id) do nothing;`). Uploads use the service role from `/api/me/upload`.
   - **Groups** (communities, join requests, group-only posts and listings): run [`supabase/migrations/007_groups.sql`](supabase/migrations/007_groups.sql). Adds `groups`, `group_memberships`, `group_join_requests`, and nullable `group_id` on `posts` and `projects`. Legacy project rows with `group_id` null are hidden from the app.

### Deploying to Vercel

1. Add the same environment variables as in `.env.local` (including `SUPABASE_SERVICE_ROLE_KEY`).
2. Set `NEXT_PUBLIC_APP_URL` to your production URL (e.g. `https://scottylinked.vercel.app` or your custom domain) **or** rely on the automatic `VERCEL_URL` fallback and add each URL you use to Supabase **Authentication → URL Configuration → Redirect URLs** (e.g. `https://<project>.vercel.app/auth/callback`).
3. Redeploy after changing environment variables so `NEXT_PUBLIC_*` values are baked into the build.

### Debugging auth

- **After login, nothing happens**: Usually a redirect URL mismatch. Set `NEXT_PUBLIC_APP_URL` in `.env.local` to your app URL (e.g. `http://localhost:3000`) and add the **exact** same URL in Supabase: Authentication → URL Configuration → Redirect URLs, e.g. `http://localhost:3000/auth/callback`.
- **Auth debug endpoint**: Open [Auth debug](/api/auth/debug) (or the "Auth debug" link in the app footer). It shows session state, app user, and the redirect URL used for OAuth (so you can confirm it matches Supabase).
- **Server logs**: Set `DEBUG_AUTH=true` in `.env.local` and restart the dev server. The auth callback will log each step (code received, exchange result, email check, user ensure) to the terminal.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

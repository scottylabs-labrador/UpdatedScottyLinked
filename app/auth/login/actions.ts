"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Base URL of the app (must match Supabase Dashboard → Auth → URL Configuration → Redirect URLs).
 * Set NEXT_PUBLIC_APP_URL in .env.local (e.g. http://localhost:3000 or https://yourdomain.com).
 */
function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const redirectTo = `${getAppUrl()}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    return { url: data.url };
  }

  return { error: "Failed to get redirect URL" };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

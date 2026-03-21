"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/app-url";

/**
 * Base URL must match Supabase Dashboard → Auth → URL Configuration → Redirect URLs.
 * Set NEXT_PUBLIC_APP_URL for custom domains; on Vercel, VERCEL_URL is used when unset.
 */
export async function signInWithGoogle() {
  const supabase = await createClient();
  const redirectTo = `${getAppBaseUrl()}/auth/callback`;

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

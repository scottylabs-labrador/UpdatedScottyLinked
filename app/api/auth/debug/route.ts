import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { NextResponse } from "next/server";

/**
 * GET /api/auth/debug
 * Returns auth/session state for debugging (no secrets).
 * Use DEBUG_AUTH=true and check server logs when debugging callback.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const redirectUrl = `${appUrl.replace(/\/$/, "")}/auth/callback`;

  const out: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      appUrl,
      redirectUrlUsedForOAuth: redirectUrl,
    },
    session: user
      ? {
          userId: user.id,
          email: user.email ?? null,
          isAndrewEmail: user.email ? isAndrewEmail(user.email) : false,
          handle: user.email ? getHandleFromEmail(user.email) : null,
        }
      : null,
    appUser: null as { id: number; handle: string; fullName: string } | null,
  };

  if (user?.email && isAndrewEmail(user.email)) {
    const handle = getHandleFromEmail(user.email);
    if (handle) {
      const appUser = await getAppUserByHandle(handle);
      if (appUser) {
        out.appUser = {
          id: appUser.id,
          handle: appUser.handle,
          fullName: appUser.fullName,
        };
      }
    }
  }

  return NextResponse.json(out, { status: 200 });
}

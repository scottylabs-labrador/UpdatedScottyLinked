import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  ensureAppUser,
} from "@/lib/auth/db";

const DEBUG_AUTH = process.env.DEBUG_AUTH === "true";

function log(...args: unknown[]) {
  if (DEBUG_AUTH) {
    console.log("[auth/callback]", ...args);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to") || `${origin}/`;
  const errorRedirect = `${origin}/?error=invalid_domain`;

  log("callback hit", { hasCode: !!code, origin, redirectTo });

  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  if (!code) {
    log("no code in URL, redirecting to home");
    return NextResponse.redirect(origin + "/");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    log("exchangeCodeForSession failed", error.message, error);
    return NextResponse.redirect(
      `${origin}/?error=code_exchange_failed&message=${encodeURIComponent(error.message)}`
    );
  }

  log("session exchanged, user id:", data.user?.id, "email:", data.user?.email);

  const email = data.user?.email;
  if (!email || !isAndrewEmail(email)) {
    log("rejected: not @andrew.cmu.edu", email);
    await supabase.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  const handle = getHandleFromEmail(email);
  if (!handle) {
    await supabase.auth.signOut();
    return NextResponse.redirect(errorRedirect);
  }

  const fullName =
    data.user?.user_metadata?.full_name ||
    data.user?.user_metadata?.name ||
    handle;
  const photoURL =
    data.user?.user_metadata?.avatar_url ||
    data.user?.user_metadata?.picture ||
    null;

  try {
    await ensureAppUser({ handle, fullName, photoURL });
    log("ensureAppUser done");
  } catch (err) {
    console.error("ensureAppUser failed (user still logged in):", err);
  }

  return response;
}

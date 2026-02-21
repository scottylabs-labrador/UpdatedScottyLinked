import { createClient } from "@/lib/supabase/server";
import { getHandleFromEmail, isAndrewEmail, getAppUserByHandle } from "@/lib/auth/db";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ user: null, appUser: null }, { status: 200 });
  }

  if (!isAndrewEmail(user.email)) {
    return NextResponse.json({ user: null, appUser: null }, { status: 200 });
  }

  const handle = getHandleFromEmail(user.email);
  if (!handle) {
    return NextResponse.json({ user: null, appUser: null }, { status: 200 });
  }

  const appUser = await getAppUserByHandle(handle);
  if (!appUser) {
    return NextResponse.json(
      { user: { email: user.email }, appUser: null },
      { status: 200 }
    );
  }

  return NextResponse.json({
    user: { email: user.email },
    appUser: {
      id: appUser.id,
      handle: appUser.handle,
      fullName: appUser.fullName,
      photoURL: appUser.photoURL,
    },
  });
}

import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
  updateAppUser,
} from "@/lib/auth/db";
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

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAndrewEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handle = getHandleFromEmail(user.email);
  if (!handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUserByHandle(handle);
  if (!appUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: {
    fullName?: string;
    major?: string | null;
    year?: string | null;
    bio?: string | null;
    photoURL?: string | null;
  } = {};
  if (typeof body.fullName === "string") updates.fullName = body.fullName;
  if (body.major !== undefined) updates.major = body.major === null ? null : String(body.major);
  if (body.year !== undefined) updates.year = body.year === null ? null : String(body.year);
  if (body.bio !== undefined) updates.bio = body.bio === null ? null : String(body.bio);
  if (body.photoURL !== undefined) updates.photoURL = body.photoURL === null ? null : String(body.photoURL);

  const updated = await updateAppUser(appUser.id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    appUser: {
      id: updated.id,
      handle: updated.handle,
      fullName: updated.fullName,
      photoURL: updated.photoURL,
    },
  });
}

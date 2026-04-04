import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
  updateAppUser,
} from "@/lib/auth/db";
import { isModeratorUser } from "@/lib/moderation";
import { parseProfilePatchBody } from "@/lib/profileValidation";
import { userToUserProfile } from "@/lib/db/users";
import { userPreferencesPayload } from "@/lib/meSettingsPatch";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ user: null, appUser: null, profile: null }, { status: 200 });
  }

  if (!isAndrewEmail(user.email)) {
    return NextResponse.json({ user: null, appUser: null, profile: null }, { status: 200 });
  }

  const handle = getHandleFromEmail(user.email);
  if (!handle) {
    return NextResponse.json({ user: null, appUser: null, profile: null }, { status: 200 });
  }

  const appUser = await getAppUserByHandle(handle);
  if (!appUser) {
    return NextResponse.json(
      { user: { email: user.email }, appUser: null, profile: null },
      { status: 200 }
    );
  }

  const mod = await isModeratorUser(appUser.id);
  const profile = userToUserProfile(appUser, 0);

  return NextResponse.json({
    user: { email: user.email },
    appUser: {
      id: appUser.id,
      handle: appUser.handle,
      fullName: appUser.fullName,
      photoURL: appUser.photoURL,
      bannerURL: appUser.bannerURL,
      isModerator: mod,
      skills: appUser.skills ?? [],
    },
    profile,
    preferences: userPreferencesPayload(appUser),
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

  let updates;
  try {
    updates = parseProfilePatchBody(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await updateAppUser(appUser.id, {
    fullName: updates.fullName,
    major: updates.major,
    minors: updates.minors,
    degree: updates.degree,
    college: updates.college,
    year: updates.year,
    bio: updates.bio,
    photoURL: updates.photoURL,
    bannerURL: updates.bannerURL,
    skills: updates.skills,
    linkedinUrl: updates.linkedinUrl,
    githubUrl: updates.githubUrl,
    portfolioUrl: updates.portfolioUrl,
    resumeUrl: updates.resumeUrl,
    campusRoles: updates.campusRoles,
    organizations: updates.organizations,
  });
  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const mod = await isModeratorUser(updated.id);
  const profile = userToUserProfile(updated, 0);

  return NextResponse.json({
    appUser: {
      id: updated.id,
      handle: updated.handle,
      fullName: updated.fullName,
      photoURL: updated.photoURL,
      bannerURL: updated.bannerURL,
      isModerator: mod,
      skills: updated.skills ?? [],
    },
    profile,
  });
}

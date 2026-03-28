import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { isModeratorUser } from "@/lib/moderation";
import { userToUserProfile } from "@/lib/db/users";
import type { UserProfile } from "@/lib/types";

/** Serializable app user for RSC props and /api/me–aligned payloads. */
export type ServerAppUser = {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
  bannerURL: string | null;
  isModerator: boolean;
  skills: string[];
};

export type ServerMe = {
  userEmail: string | null;
  appUser: ServerAppUser | null;
  profile: UserProfile | null;
};

/**
 * Resolve the signed-in Andrew user and app profile (same rules as GET /api/me).
 * Server-only.
 */
export async function getServerMe(): Promise<ServerMe> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAndrewEmail(user.email)) {
    return { userEmail: null, appUser: null, profile: null };
  }

  const handle = getHandleFromEmail(user.email);
  if (!handle) {
    return { userEmail: user.email, appUser: null, profile: null };
  }

  const dbUser = await getAppUserByHandle(handle);
  if (!dbUser) {
    return { userEmail: user.email, appUser: null, profile: null };
  }

  const mod = await isModeratorUser(dbUser.id);
  const profile = userToUserProfile(dbUser, 0);

  return {
    userEmail: user.email,
    appUser: {
      id: dbUser.id,
      handle: dbUser.handle,
      fullName: dbUser.fullName,
      photoURL: dbUser.photoURL,
      bannerURL: dbUser.bannerURL,
      isModerator: mod,
      skills: dbUser.skills ?? [],
    },
    profile,
  };
}

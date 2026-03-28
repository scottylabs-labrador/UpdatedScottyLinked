import { getServerMe, type ServerAppUser } from "@/lib/session";
import { getConnectedUserIdsAdmin } from "@/lib/db/connections";
import { getHiddenUserIdsForViewer } from "@/lib/db/blocks";
import { getFeedPosts } from "@/lib/db/posts";
import { getProfiles } from "@/lib/db/users";
import {
  listGroupsBrowseForViewer,
  listJoinedGroupsForUser,
} from "@/lib/db/groups";
import type {
  FeedPost,
  GroupListItem,
  Profile,
  UserProfile,
} from "@/lib/types";

export type HomeBootstrap = {
  userEmail: string | null;
  appUser: ServerAppUser | null;
  profile: UserProfile | null;
  posts: FeedPost[];
  groups: GroupListItem[];
  profiles: Profile[];
  connectedIds: number[];
  myGroups: { id: number; name: string }[];
};

/**
 * One parallel load for the home page (feed, groups, network list, composer groups).
 * Server-only; mirrors GET /api/home.
 */
export async function getHomeBootstrap(): Promise<HomeBootstrap> {
  const me = await getServerMe();
  const uid = me.appUser?.id ?? null;

  const [connected, hiddenIds, groups, profiles, myGroups] = await Promise.all([
    uid != null ? getConnectedUserIdsAdmin(uid) : Promise.resolve<number[]>([]),
    uid != null ? getHiddenUserIdsForViewer(uid) : Promise.resolve<number[]>([]),
    listGroupsBrowseForViewer(uid),
    getProfiles(uid ?? 0),
    uid != null ? listJoinedGroupsForUser(uid) : Promise.resolve([]),
  ]);

  const posts = await getFeedPosts(uid, connected, 50, hiddenIds);

  return {
    userEmail: me.userEmail,
    appUser: me.appUser,
    profile: me.profile,
    posts,
    groups,
    profiles,
    connectedIds: connected,
    myGroups,
  };
}

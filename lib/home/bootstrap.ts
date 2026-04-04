import { getServerMe, type ServerAppUser } from "@/lib/session";
import { getConnectedUserIdsAdmin } from "@/lib/db/connections";
import { getHiddenUserIdsForViewer } from "@/lib/db/blocks";
import { getFeedPostsPaginated, type FeedCursor } from "@/lib/db/posts";
import { getProfilesPaginated } from "@/lib/db/users";
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
import {
  HOME_FEED_PAGE_SIZE,
  HOME_PROFILES_PAGE_SIZE,
} from "@/lib/home/pagination";

export type HomeBootstrap = {
  userEmail: string | null;
  appUser: ServerAppUser | null;
  profile: UserProfile | null;
  posts: FeedPost[];
  /** Cursor for the next `/api/feed` page (last item of `posts`). */
  feedNextCursor: FeedCursor | null;
  feedHasMore: boolean;
  groups: GroupListItem[];
  profiles: Profile[];
  profilesNextOffset: number;
  profilesHasMore: boolean;
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

  const [connected, hiddenIds, groups, profilesPage, myGroups] =
    await Promise.all([
      uid != null ? getConnectedUserIdsAdmin(uid) : Promise.resolve<number[]>([]),
      uid != null ? getHiddenUserIdsForViewer(uid) : Promise.resolve<number[]>([]),
      listGroupsBrowseForViewer(uid),
      getProfilesPaginated(uid ?? 0, HOME_PROFILES_PAGE_SIZE, 0),
      uid != null ? listJoinedGroupsForUser(uid) : Promise.resolve([]),
    ]);

  const feedPage = await getFeedPostsPaginated(
    uid,
    connected,
    HOME_FEED_PAGE_SIZE,
    hiddenIds,
    null
  );

  return {
    userEmail: me.userEmail,
    appUser: me.appUser,
    profile: me.profile,
    posts: feedPage.posts,
    feedNextCursor: feedPage.nextCursor,
    feedHasMore: feedPage.hasMore,
    groups,
    profiles: profilesPage.profiles,
    profilesNextOffset: profilesPage.nextOffset,
    profilesHasMore: profilesPage.hasMore,
    connectedIds: connected,
    myGroups,
  };
}

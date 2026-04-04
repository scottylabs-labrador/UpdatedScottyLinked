import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getConnectedUserIdsAdmin } from "@/lib/db/connections";
import { getHiddenUserIdsForViewer } from "@/lib/db/blocks";
import {
  getFeedPostsPaginated,
  type FeedCursor,
} from "@/lib/db/posts";
import { HOME_FEED_PAGE_SIZE } from "@/lib/home/pagination";

function parseCursor(sp: URLSearchParams): FeedCursor | null {
  const createdAt = sp.get("afterCreatedAt")?.trim();
  const idRaw = sp.get("afterId");
  if (!createdAt || idRaw == null) return null;
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id)) return null;
  return { createdAt, id };
}

/** GET ?limit=&afterCreatedAt=&afterId= — next feed page (auth optional; anon sees public slice). */
export async function GET(request: Request) {
  try {
    const uid = await getCurrentAppUserId();
    const { searchParams } = new URL(request.url);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw
      ? Math.max(1, Math.min(parseInt(limitRaw, 10) || HOME_FEED_PAGE_SIZE, 30))
      : HOME_FEED_PAGE_SIZE;
    const cursor = parseCursor(searchParams);

    const [connected, hiddenIds] = await Promise.all([
      uid != null ? getConnectedUserIdsAdmin(uid) : Promise.resolve<number[]>([]),
      uid != null ? getHiddenUserIdsForViewer(uid) : Promise.resolve<number[]>([]),
    ]);

    const page = await getFeedPostsPaginated(
      uid,
      connected,
      limit,
      hiddenIds,
      cursor
    );

    return NextResponse.json({
      posts: page.posts,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
    });
  } catch (e) {
    console.error("GET /api/feed:", e);
    return NextResponse.json(
      { error: "Failed to load feed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { getProfilesPaginated } from "@/lib/db/users";
import { HOME_PROFILES_PAGE_SIZE } from "@/lib/home/pagination";

/** GET ?offset=&limit= — paginated discover list (auth required). */
export async function GET(request: Request) {
  const uid = await getCurrentAppUserId();
  if (uid == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw
      ? Math.max(1, Math.min(parseInt(limitRaw, 10) || HOME_PROFILES_PAGE_SIZE, 50))
      : HOME_PROFILES_PAGE_SIZE;

    const page = await getProfilesPaginated(uid, limit, offset);
    return NextResponse.json({
      profiles: page.profiles,
      nextOffset: page.nextOffset,
      hasMore: page.hasMore,
    });
  } catch (e) {
    console.error("GET /api/network/profiles:", e);
    return NextResponse.json(
      { error: "Failed to load profiles" },
      { status: 500 }
    );
  }
}

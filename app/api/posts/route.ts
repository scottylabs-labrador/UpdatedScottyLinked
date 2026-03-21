import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { createPost as insertPost } from "@/lib/db/posts";
import { NextResponse } from "next/server";

async function getCurrentAppUserId(): Promise<number | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAndrewEmail(user.email)) return null;
  const handle = getHandleFromEmail(user.email);
  if (!handle) return null;
  const appUser = await getAppUserByHandle(handle);
  return appUser?.id ?? null;
}

const AUDIENCES = new Set(["public", "connections", "private"]);

/** POST: create a post (auth required). Body: { title?, content, tags?, audience? } */
export async function POST(request: Request) {
  const authorId = await getCurrentAppUserId();
  if (authorId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    content?: string;
    tags?: string[];
    audience?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content =
    typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const audience =
    typeof body.audience === "string" && AUDIENCES.has(body.audience)
      ? body.audience
      : "public";
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string")
    : [];
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : content.substring(0, 50).trim() || "New Post";

  const supabase = await createClient();
  const post = await insertPost(
    {
      title,
      content,
      authorId,
      audience,
      tags,
    },
    supabase
  );

  if (!post) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({ id: (post as { id: number }).id }, { status: 201 });
}

import { createClient } from "@/lib/supabase/server";
import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { createPost as insertPost } from "@/lib/db/posts";
import { filterGroupIdsWhereMember, isGroupMember } from "@/lib/db/groups";
import type { NewPost, PostVisibilityScope } from "@/lib/types";
import { NextResponse } from "next/server";

const AUDIENCES = new Set(["public", "connections", "private"]);
const VIS_SCOPES = new Set<string>([
  "public",
  "connections",
  "private",
  "group",
]);

function parseVisibilityBody(
  raw: unknown
):
  | { ok: true; rules: Array<{ scope: PostVisibilityScope; groupId?: number }> }
  | { ok: false; message: string } {
  if (!Array.isArray(raw)) {
    return { ok: false, message: "visibility must be an array" };
  }
  if (raw.length === 0) {
    return { ok: false, message: "At least one visibility rule is required" };
  }
  const rules: Array<{ scope: PostVisibilityScope; groupId?: number }> = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, message: "Invalid visibility entry" };
    }
    const scope = (item as { scope?: unknown }).scope;
    if (typeof scope !== "string" || !VIS_SCOPES.has(scope)) {
      return { ok: false, message: "Invalid visibility scope" };
    }
    if (scope === "group") {
      const g = (item as { groupId?: unknown }).groupId;
      let groupId: number;
      if (typeof g === "number" && Number.isFinite(g)) {
        groupId = g;
      } else if (typeof g === "string") {
        const n = parseInt(g, 10);
        if (!Number.isFinite(n)) {
          return { ok: false, message: "group visibility requires groupId" };
        }
        groupId = n;
      } else {
        return { ok: false, message: "group visibility requires groupId" };
      }
      rules.push({ scope: "group", groupId });
    } else {
      rules.push({ scope: scope as PostVisibilityScope });
    }
  }
  return { ok: true, rules };
}

/** POST: create a post (auth required). Body: { title?, content, tags?, visibility? } or legacy audience / groupId. */
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
    groupId?: number;
    visibility?: unknown;
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

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string")
    : [];
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : content.substring(0, 50).trim() || "New Post";

  let newPost: NewPost;

  if (body.visibility !== undefined) {
    const parsed = parseVisibilityBody(body.visibility);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.message }, { status: 400 });
    }
    const groupRuleIds = parsed.rules
      .filter((v) => v.scope === "group" && v.groupId != null)
      .map((v) => v.groupId as number);
    const memberIn = await filterGroupIdsWhereMember(authorId, groupRuleIds);
    for (const gid of groupRuleIds) {
      if (!memberIn.has(gid)) {
        return NextResponse.json(
          { error: "You must be a member of each selected group" },
          { status: 403 }
        );
      }
    }
    newPost = {
      title,
      content,
      authorId,
      tags,
      audience: "multi",
      visibility: parsed.rules,
    };
  } else {
    const rawGid = body.groupId;
    const groupIdNum =
      typeof rawGid === "number" && Number.isFinite(rawGid)
        ? rawGid
        : typeof rawGid === "string"
          ? parseInt(rawGid, 10)
          : NaN;

    let audience: string;
    let groupId: number | undefined;

    if (!isNaN(groupIdNum)) {
      const member = await isGroupMember(groupIdNum, authorId);
      if (!member) {
        return NextResponse.json(
          { error: "You must be a group member to post there" },
          { status: 403 }
        );
      }
      audience = "group";
      groupId = groupIdNum;
    } else {
      audience =
        typeof body.audience === "string" && AUDIENCES.has(body.audience)
          ? body.audience
          : "public";
    }

    newPost = {
      title,
      content,
      authorId,
      tags,
      audience,
      groupId,
    };
  }

  const supabase = await createClient();
  const post = await insertPost(newPost, supabase);

  if (!post) {
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({ id: (post as { id: number }).id }, { status: 201 });
}

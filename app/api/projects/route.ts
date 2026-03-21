import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { createProjectAdmin } from "@/lib/db/projects";
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

/** POST: create a project / teammate listing. */
export async function POST(request: Request) {
  const authorId = await getCurrentAppUserId();
  if (authorId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title?: string;
    description?: string;
    skills?: string[];
    level?: string;
    type?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  if (!title || !description) {
    return NextResponse.json(
      { error: "title and description required" },
      { status: 400 }
    );
  }

  const skills = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === "string")
    : [];

  const project = await createProjectAdmin({
    title,
    description,
    skills,
    level: typeof body.level === "string" ? body.level : undefined,
    type: typeof body.type === "string" ? body.type : undefined,
    authorId,
  });

  if (!project) {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ id: (project as { id: number }).id }, { status: 201 });
}

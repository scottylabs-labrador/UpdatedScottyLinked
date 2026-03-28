import { getCurrentAppUserId } from "@/lib/api/currentUser";
import { createGroup, listGroupsBrowseForViewer } from "@/lib/db/groups";
import { NextResponse } from "next/server";

/** GET: list all groups with member counts and viewer context */
export async function GET() {
  const viewerId = await getCurrentAppUserId();
  const items = await listGroupsBrowseForViewer(viewerId);
  return NextResponse.json({ groups: items });
}

/** POST: create group { name, description } */
export async function POST(request: Request) {
  const userId = await getCurrentAppUserId();
  if (userId == null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const description =
    typeof body.description === "string" ? body.description.trim() : "";

  const group = await createGroup({
    name,
    description,
    createdBy: userId,
  });

  if (!group) {
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }

  return NextResponse.json({ group }, { status: 201 });
}

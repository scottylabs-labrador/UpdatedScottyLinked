import { getUserProfile } from "@/lib/db/users";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const id = parseInt(userId, 10);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }
  const profile = await getUserProfile(id);
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

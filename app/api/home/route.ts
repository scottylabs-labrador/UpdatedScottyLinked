import { getHomeBootstrap } from "@/lib/home/bootstrap";
import { NextResponse } from "next/server";

/** GET: full home bootstrap (same payload as server-rendered initial props). */
export async function GET() {
  try {
    const data = await getHomeBootstrap();
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/home:", e);
    return NextResponse.json({ error: "Failed to load home" }, { status: 500 });
  }
}

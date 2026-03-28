import { createClient } from "@/lib/supabase/server";
import {
  getHandleFromEmail,
  isAndrewEmail,
  getAppUserByHandle,
} from "@/lib/auth/db";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

const BUCKET = "profile-media";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extForMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Server storage not configured" },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isAndrewEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const handle = getHandleFromEmail(user.email);
  if (!handle) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUser = await getAppUserByHandle(handle);
  if (!appUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const kindRaw = form.get("kind");
  const file = form.get("file");

  if (kindRaw !== "avatar" && kindRaw !== "banner") {
    return NextResponse.json(
      { error: 'kind must be "avatar" or "banner"' },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or GIF images are allowed" },
      { status: 400 }
    );
  }

  const ext = extForMime(mime);
  const path = `${appUser.id}/${kindRaw}-${Date.now()}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buf, {
      contentType: mime,
      upsert: true,
    });

  if (upErr) {
    console.error("Storage upload error:", upErr);
    return NextResponse.json(
      {
        error:
          "Upload failed. Ensure the Storage bucket `profile-media` exists and is public.",
      },
      { status: 500 }
    );
  }

  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  return NextResponse.json({ url, kind: kindRaw });
}

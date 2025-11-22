import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getConnectedUserIds } from "./connections";

export async function getPostsIDs(userId: number, global: boolean) {
  let connectedIds = await getConnectedUserIds(userId, true);

  if (connectedIds.length === 0) connectedIds = [-1];

  let query = supabaseAdmin.from("posts").select("id, authorID, audience"); // only return IDs

  if (global) {
    query = query.or(
      `authorId.in.(${connectedIds.join(",")}),audience.eq.public`
    );
  } else {
    query = query.in("authorId", connectedIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data.map((row) => row.id);
}

export async function getPostInfo(id: string) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("id", id)
    .single(); // ensures only one row is returned
  
  if (error) {
    console.error("Error fetching post:", error);
    return null;
  }

  return data; // this will be an object, not an array
}

type NewPost = {
  title: string;
  content: string;
  authorId: string;
  tags?: string[];
  audience: string;
};

export async function createPost(post: NewPost) {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
}

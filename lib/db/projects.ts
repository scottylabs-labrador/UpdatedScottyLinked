import { supabase } from "@/lib/supabaseClient";
import { getConnectedUserIds } from "./connections";
import { Project, NewPost, Opportunity } from "@/lib/types";

export async function getPostsIDs(userId: number, global: boolean) {
  let connectedIds = await getConnectedUserIds(userId, true);

  if (connectedIds.length === 0) connectedIds = [-1];

  let query = supabase.from("posts").select("id, authorID, audience"); // only return IDs

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

export async function getProjects(amount: number): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false }) // newest first
    .limit(amount);

  if (error) {
    console.error("Error fetching project:", error);
    return [];
  }
  return data; // this will be an object, not an array
}

export async function createPost(post: NewPost) {
  const { data, error } = await supabase
    .from("posts")
    .insert(post)
    .select()
    .single();

  if (error) throw error;
  return data;
}

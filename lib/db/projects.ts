import { supabase } from "@/lib/supabaseClient";
import { getConnectedUserIds } from "./connections";
import { Project, NewPost, Opportunity } from "@/lib/types";

export async function getPostsIDs(userId: number, global: boolean) {
  let connectedIds = await getConnectedUserIds(userId, true);

  if (connectedIds.length === 0) connectedIds = [-1];

  let query = supabase.from("posts").select("id, authorid, audience");

  if (global) {
    query = query.or(
      `authorid.in.(${connectedIds.join(",")}),audience.eq.public`
    );
  } else {
    query = query.in("authorid", connectedIds);
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
  const authorId =
    typeof post.authorId === "string"
      ? parseInt(post.authorId, 10)
      : post.authorId;
  const { data, error } = await supabase
    .from("posts")
    .insert({
      title: post.title,
      content: post.content,
      authorid: authorId,
      tags: post.tags ?? [],
      audience: post.audience,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

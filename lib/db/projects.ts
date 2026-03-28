import { supabase } from "@/lib/supabaseClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getConnectedUserIds } from "./connections";
import { Project, NewPost } from "@/lib/types";
import { getUserById } from "./users";

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
  return (data ?? []) as Project[];
}

function rowToProject(row: Record<string, unknown>): Project {
  const rawGid = row.group_id ?? row.groupId;
  const groupId =
    rawGid == null || rawGid === ""
      ? null
      : typeof rawGid === "number"
        ? rawGid
        : Number(rawGid);
  return {
    id: row.id as number,
    created_at: (row.created_at as string) ?? "",
    title: (row.title as string) ?? "",
    author: (row.author as string) ?? "",
    authorID: (row.authorid as number) ?? (row.authorID as number),
    skills: (row.skills as string[]) ?? [],
    description: (row.description as string) ?? "",
    level: (row.level as string) ?? "",
    type: (row.type as string) ?? "",
    groupId: Number.isFinite(groupId as number) ? (groupId as number) : null,
  };
}

/** Full project row for detail page (service role). */
export async function getProjectByIdFull(projectId: number): Promise<Project | null> {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToProject(data as Record<string, unknown>);
}

export type NewProjectInput = {
  title: string;
  description: string;
  skills: string[];
  level?: string;
  type?: string;
  authorId: number;
  /** Required for new listings; global listings are no longer created from the app. */
  groupId: number;
};

/** Insert a project listing (server; service role). */
export async function createProjectAdmin(
  input: NewProjectInput
): Promise<Project | null> {
  if (!supabaseAdmin) return null;

  const author = await getUserById(input.authorId);
  if (!author) return null;

  const row = {
    title: input.title.trim(),
    description: input.description.trim(),
    author: author.fullName,
    authorid: input.authorId,
    skills: input.skills,
    level: input.level?.trim() || "Any",
    type: input.type?.trim() || "Project",
    created_at: new Date().toISOString(),
    group_id: input.groupId,
  };

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return null;
  }

  return data as Project;
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

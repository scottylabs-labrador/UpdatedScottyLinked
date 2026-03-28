import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Opportunity, Project } from "@/lib/types";
import { getUsersByIds } from "@/lib/db/users";
import { isGroupMember } from "@/lib/db/groups";

function projectToOpportunity(
  project: Project,
  authors: Awaited<ReturnType<typeof getUsersByIds>>
): Opportunity {
  const aid =
    typeof project.authorID === "number"
      ? project.authorID
      : (project as unknown as { authorid?: number }).authorid;
  const owner = authors.find((u) => u.id === aid);
  const contactEmail = owner?.handle
    ? `${owner.handle}@andrew.cmu.edu`
    : null;

  return {
    id: project.id,
    title: project.title,
    company: project.author || "CMU Project",
    type: project.type || "Project",
    location: "Pittsburgh, PA",
    posted: formatPosted(project.created_at),
    skills: project.skills || [],
    description: project.description || "",
    authorId: aid,
    contactEmail,
  };
}

function formatPosted(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return "1 week ago";
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  return date.toLocaleDateString();
}

/**
 * Global opportunities list is deprecated; listings are group-scoped only.
 */
export async function getOpportunities(_limit: number = 50): Promise<Opportunity[]> {
  return [];
}

/**
 * Listings for one group (members only).
 */
export async function getGroupOpportunities(
  groupId: number,
  viewerId: number | null
): Promise<Opportunity[]> {
  if (!supabaseAdmin || viewerId == null) return [];
  const member = await isGroupMember(groupId, viewerId);
  if (!member) return [];

  try {
    const { data: projects, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !projects?.length) return [];

    const authorIds = [
      ...new Set(
        (projects as Record<string, unknown>[]).map((p) => {
          const id = (p.authorid as number) ?? (p.authorID as number);
          return typeof id === "number" ? id : 0;
        })
      ),
    ].filter((id) => id > 0);
    const authors = authorIds.length ? await getUsersByIds(authorIds) : [];

    return (projects as Project[]).map((p) => projectToOpportunity(p, authors));
  } catch (e) {
    console.error("getGroupOpportunities:", e);
    return [];
  }
}


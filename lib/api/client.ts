/**
 * Browser-only: `fetch` wrappers for authenticated routes. Do not import `lib/db` here.
 */
import type { UserProfile } from "@/lib/types";

export type CreatePostVisibilityRow = {
  scope: string;
  groupId?: number;
};

export type CreatePostInput = {
  title?: string;
  content: string;
  tags?: string[];
  audience?: string;
  groupId?: number;
  visibility?: CreatePostVisibilityRow[];
};

export async function createPost(
  title: string,
  content: string,
  tags?: string[],
  audience?: string,
  groupId?: number
): Promise<boolean>;
export async function createPost(input: CreatePostInput): Promise<boolean>;
export async function createPost(
  titleOrInput: string | CreatePostInput,
  content?: string,
  tags: string[] = [],
  audience = "public",
  groupId?: number
): Promise<boolean> {
  try {
    const input: CreatePostInput =
      typeof titleOrInput === "string"
        ? {
            title: titleOrInput,
            content: content!,
            tags,
            audience,
            groupId,
          }
        : titleOrInput;

    const postTitle =
      (input.title?.trim() ||
        input.content.substring(0, 50).trim() ||
        "New Post");
    const body: Record<string, unknown> = {
      title: postTitle,
      content: input.content,
      tags: input.tags ?? [],
    };
    if (input.visibility != null && input.visibility.length > 0) {
      body.visibility = input.visibility;
    } else {
      body.audience = input.audience ?? "public";
      if (input.groupId != null) body.groupId = input.groupId;
    }
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (error) {
    console.error("Error creating post:", error);
    return false;
  }
}

/** PATCH /api/me — available for client forms that prefer a helper over raw fetch. */
export async function updateUserProfile(
  _userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  try {
    const body: Record<string, unknown> = {};
    if (updates.name !== undefined) body.fullName = updates.name;
    if (updates.major !== undefined) body.major = updates.major;
    if (updates.minors !== undefined) body.minors = updates.minors;
    if (updates.degree !== undefined) body.degree = updates.degree;
    if (updates.college !== undefined) body.college = updates.college;
    if (updates.year !== undefined) body.year = updates.year;
    if (updates.bio !== undefined) body.bio = updates.bio;
    if (updates.photoURL !== undefined) body.photoURL = updates.photoURL;
    if (updates.bannerURL !== undefined) body.bannerURL = updates.bannerURL;
    if (updates.linkedinUrl !== undefined) body.linkedinUrl = updates.linkedinUrl;
    if (updates.githubUrl !== undefined) body.githubUrl = updates.githubUrl;
    if (updates.portfolioUrl !== undefined) body.portfolioUrl = updates.portfolioUrl;
    if (updates.resumeUrl !== undefined) body.resumeUrl = updates.resumeUrl;
    if (updates.skills !== undefined) body.skills = updates.skills;
    if (updates.campusRoles !== undefined) body.campusRoles = updates.campusRoles;
    if (updates.organizations !== undefined) body.organizations = updates.organizations;
    if (Object.keys(body).length === 0) return true;

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (error) {
    console.error("Error updating profile:", error);
    return false;
  }
}

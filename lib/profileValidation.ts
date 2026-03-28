import type { ProfileOrganization } from "@/lib/types";

const MAX_LEN = {
  fullName: 120,
  major: 120,
  minors: 240,
  degree: 80,
  college: 120,
  year: 32,
  bio: 2000,
  url: 2048,
  skill: 48,
  skills: 24,
  campusRole: 48,
  campusRoles: 24,
  orgName: 120,
  orgRole: 80,
  orgs: 24,
} as const;

function isHttpsUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns normalized URL or null if empty; throws message if invalid. */
export function parseOptionalHttpsUrl(raw: string, field: string): string | null {
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > MAX_LEN.url) throw new Error(`${field} is too long`);
  if (!isHttpsUrl(t)) throw new Error(`${field} must be an https:// URL`);
  return t;
}

export function parseProfilePatchBody(body: Record<string, unknown>): {
  fullName?: string;
  major?: string | null;
  minors?: string | null;
  degree?: string | null;
  college?: string | null;
  year?: string | null;
  bio?: string | null;
  photoURL?: string | null;
  bannerURL?: string | null;
  skills?: string[];
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  resumeUrl?: string | null;
  campusRoles?: string[];
  organizations?: ProfileOrganization[];
} {
  const out: ReturnType<typeof parseProfilePatchBody> = {};

  if (typeof body.fullName === "string") {
    const v = body.fullName.trim();
    if (v.length > MAX_LEN.fullName) throw new Error("fullName too long");
    out.fullName = v;
  }

  if (body.major !== undefined) {
    if (body.major === null) out.major = null;
    else {
      const v = String(body.major).trim();
      if (v.length > MAX_LEN.major) throw new Error("major too long");
      out.major = v || null;
    }
  }

  if (body.minors !== undefined) {
    if (body.minors === null) out.minors = null;
    else {
      const v = String(body.minors).trim();
      if (v.length > MAX_LEN.minors) throw new Error("minors too long");
      out.minors = v || null;
    }
  }

  if (body.degree !== undefined) {
    if (body.degree === null) out.degree = null;
    else {
      const v = String(body.degree).trim();
      if (v.length > MAX_LEN.degree) throw new Error("degree too long");
      out.degree = v || null;
    }
  }

  if (body.college !== undefined) {
    if (body.college === null) out.college = null;
    else {
      const v = String(body.college).trim();
      if (v.length > MAX_LEN.college) throw new Error("college too long");
      out.college = v || null;
    }
  }

  if (body.year !== undefined) {
    if (body.year === null) out.year = null;
    else {
      const v = String(body.year).trim();
      if (v.length > MAX_LEN.year) throw new Error("year too long");
      out.year = v || null;
    }
  }

  if (body.bio !== undefined) {
    if (body.bio === null) out.bio = null;
    else {
      const v = String(body.bio).trim();
      if (v.length > MAX_LEN.bio) throw new Error("bio too long");
      out.bio = v || null;
    }
  }

  if (body.photoURL !== undefined) {
    if (body.photoURL === null) out.photoURL = null;
    else if (typeof body.photoURL !== "string")
      throw new Error("photoURL must be a string or null");
    else out.photoURL = parseOptionalHttpsUrl(body.photoURL, "photoURL");
  }
  if (body.bannerURL !== undefined) {
    if (body.bannerURL === null) out.bannerURL = null;
    else if (typeof body.bannerURL !== "string")
      throw new Error("bannerURL must be a string or null");
    else out.bannerURL = parseOptionalHttpsUrl(body.bannerURL, "bannerURL");
  }
  if (body.linkedinUrl !== undefined) {
    if (body.linkedinUrl === null) out.linkedinUrl = null;
    else if (typeof body.linkedinUrl !== "string")
      throw new Error("linkedinUrl must be a string or null");
    else out.linkedinUrl = parseOptionalHttpsUrl(body.linkedinUrl, "linkedinUrl");
  }
  if (body.githubUrl !== undefined) {
    if (body.githubUrl === null) out.githubUrl = null;
    else if (typeof body.githubUrl !== "string")
      throw new Error("githubUrl must be a string or null");
    else out.githubUrl = parseOptionalHttpsUrl(body.githubUrl, "githubUrl");
  }
  if (body.portfolioUrl !== undefined) {
    if (body.portfolioUrl === null) out.portfolioUrl = null;
    else if (typeof body.portfolioUrl !== "string")
      throw new Error("portfolioUrl must be a string or null");
    else
      out.portfolioUrl = parseOptionalHttpsUrl(body.portfolioUrl, "portfolioUrl");
  }
  if (body.resumeUrl !== undefined) {
    if (body.resumeUrl === null) out.resumeUrl = null;
    else if (typeof body.resumeUrl !== "string")
      throw new Error("resumeUrl must be a string or null");
    else out.resumeUrl = parseOptionalHttpsUrl(body.resumeUrl, "resumeUrl");
  }

  if (Array.isArray(body.skills)) {
    out.skills = body.skills
      .filter((s: unknown): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_LEN.skills)
      .map((s) => s.slice(0, MAX_LEN.skill));
  }

  if (Array.isArray(body.campusRoles)) {
    out.campusRoles = body.campusRoles
      .filter((s: unknown): s is string => typeof s === "string")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_LEN.campusRoles)
      .map((s) => s.slice(0, MAX_LEN.campusRole));
  }

  if (body.organizations !== undefined) {
    if (body.organizations === null) {
      out.organizations = [];
    } else if (!Array.isArray(body.organizations)) {
      throw new Error("organizations must be an array");
    } else {
      const orgs: ProfileOrganization[] = [];
      for (const item of body.organizations) {
        if (orgs.length >= MAX_LEN.orgs) break;
        if (!item || typeof item !== "object") continue;
        const name = String(
          (item as { name?: unknown }).name ?? ""
        ).trim();
        if (!name) continue;
        const roleRaw = (item as { role?: unknown }).role;
        const role =
          typeof roleRaw === "string"
            ? roleRaw.trim().slice(0, MAX_LEN.orgRole)
            : undefined;
        orgs.push({
          name: name.slice(0, MAX_LEN.orgName),
          ...(role ? { role } : {}),
        });
      }
      out.organizations = orgs;
    }
  }

  return out;
}

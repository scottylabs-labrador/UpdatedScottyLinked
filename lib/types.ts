// ==================== DATABASE SCHEMA TYPES ====================

/** Affiliation row stored in users.organizations (JSON). */
export interface ProfileOrganization {
  name: string;
  role?: string;
}

/**
 * User table from database schema
 * Matches the users table structure
 */
export interface User {
  id: number;
  handle: string;
  fullName: string;
  photoURL: string | null;
  bannerURL: string | null;
  major: string | null;
  minors: string | null;
  degree: string | null;
  college: string | null;
  year: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  resumeUrl: string | null;
  campusRoles: string[];
  organizations: ProfileOrganization[];
  created_at: string;
  updated_at: string | null;
  /** Present when loaded from DB (moderation). */
  isModerator?: boolean;
  /** Profile skill tags (discovery). */
  skills?: string[];
}

/**
 * Project table from database schema
 * Matches the projects table structure
 */
export interface Project {
  id: number;
  created_at: string;
  title: string;
  author: string;
  authorID: number; // Foreign key to users.id
  skills: string[]; // Array of text values
  description: string;
  level: string;
  type: string;
  /** When set, listing is scoped to this group (members only). */
  groupId?: number | null;
}

/**
 * Connection table from database schema
 * Matches the connections table structure
 */
export interface Connection {
  id: number;
  requester_id: number; // Foreign key to users.id
  reciever_id: number; // Foreign key to users.id (note: typo in schema)
  status: string; // e.g., "pending", "accepted", "rejected"
  created_at: string;
}

/**
 * Post table from database schema
 * Matches the posts table structure
 */
export interface Post {
  id: number;
  authorID: number; // Foreign key to users.id
  audience: string; // e.g., "public", "connections", "group"
  title: string;
  content: string;
  tags: string[]; // Array of text values
  created_at: string;
  /** When set, post is visible only to members of this group. */
  groupId?: number | null;
}

/**
 * PostComment table from database schema
 * Matches the postComments table structure
 */
export interface PostComment {
  id: number;
  authorID: number; // Foreign key to users.id
  postID: number; // Foreign key to posts.id
  content: string;
  created_at: string;
}

/**
 * PostImage table from database schema
 * Matches the postImages table structure
 */
export interface PostImage {
  id: number;
  postID: number; // Foreign key to posts.id
  imageURL: string;
  alt: string;
  created_at: string;
}

// ==================== UI COMPONENT TYPES ====================

/**
 * Post type for UI components (Feed)
 * Extends database Post with UI-specific fields
 */
export interface FeedPost {
  id: number;
  author: string;
  authorId?: number;
  authorPhotoURL?: string | null;
  major: string;
  avatar: string;
  timestamp: string;
  title?: string;
  content: string;
  tags?: string[];
  audience?: string;
  /** Set for group-scoped posts (legacy / primary group). */
  groupId?: number | null;
  /** Human-readable visibility for badges (multi-audience). */
  visibilitySummary?: string;
  /** Group IDs in visibility rules (for feed filter chips). */
  visibilityGroupIds?: number[];
  likes: number;
  comments: number;
  /** True if current user has liked this post (only set when fetched with user context). */
  liked?: boolean;
}

/**
 * Opportunity type for UI components (group-scoped listings).
 */
export interface Opportunity {
  id: number;
  title: string;
  company: string;
  type: string;
  location: string;
  posted: string;
  skills: string[];
  description: string;
  /** Project owner app user id. */
  authorId?: number;
  /** Legacy; in-app interest replaces mailto. */
  contactEmail?: string | null;
}

/**
 * Profile type for UI components (Network)
 * Used in network component to display user profiles
 */
export interface Profile {
  id: number;
  name: string;
  avatar: string;
  photoURL?: string | null;
  major: string;
  year: string;
  skills: string[];
  bio: string;
  connections: number;
}

/**
 * UserProfile for profile tab and public profile API
 */
export interface UserProfile {
  id: number;
  name: string;
  handle: string;
  /** Initials for Avatar fallback */
  avatar: string;
  photoURL?: string | null;
  bannerURL?: string | null;
  major: string;
  minors: string;
  degree: string;
  college: string;
  year: string;
  email: string;
  skills: string[];
  bio: string;
  connections: number;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeUrl: string;
  campusRoles: string[];
  organizations: ProfileOrganization[];
}

// ==================== ADDITIONAL TYPES ====================

/**
 * Research opportunity type
 * Used in research page (not in database schema yet)
 */
export interface Research {
  id: number;
  position: string;
  field: string;
  leadType: string; // PhD-led, Student-led
  experienceNeeded: string;
  skills: string[];
  experience: string; // e.g., "1-2 years"
}

/**
 * NewPost type for creating posts
 * Used in posts creation functions
 */
export type PostVisibilityScope = "public" | "connections" | "private" | "group";

export interface NewPost {
  title: string;
  content: string;
  authorId: string | number;
  tags?: string[];
  /** Legacy single audience when `visibility` is omitted. */
  audience: string;
  /** Legacy single group. */
  groupId?: number | null;
  /**
   * OR semantics: viewers who match any rule can see the post.
   * When non-empty, takes precedence over `audience` / `groupId`.
   */
  visibility?: Array<{ scope: PostVisibilityScope; groupId?: number }>;
}

/** Community group (database `groups` table). */
export interface CommunityGroup {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  created_at: string;
  updated_at?: string | null;
}

export type GroupMembershipRole = "owner" | "moderator" | "member";

export type GroupJoinRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export interface GroupMembershipRow {
  groupId: number;
  userId: number;
  role: GroupMembershipRole;
  created_at: string;
}

export interface GroupJoinRequestRow {
  id: number;
  groupId: number;
  applicantId: number;
  message: string | null;
  status: GroupJoinRequestStatus;
  created_at: string;
  reviewedBy: number | null;
  reviewed_at: string | null;
}

/** Group card on the home Groups tab (from GET /api/groups). */
export interface GroupListItem {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  created_at: string;
  memberCount: number;
  myRole: GroupMembershipRole | null;
  joinRequestStatus: GroupJoinRequestStatus | null;
}

// ==================== UTILITY TYPES ====================

/**
 * Connection status enum
 */
export type ConnectionStatus = "pending" | "accepted" | "rejected";

/**
 * Post audience enum
 */
export type PostAudience = "public" | "connections" | "private" | "group";

/**
 * Partial type for updating user profile
 */
export type UserUpdate = Partial<User>;

/**
 * Partial type for updating project
 */
export type ProjectUpdate = Partial<Omit<Project, "id" | "created_at">>;

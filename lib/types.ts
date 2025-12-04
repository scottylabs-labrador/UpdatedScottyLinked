// ==================== DATABASE SCHEMA TYPES ====================

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
  year: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string | null;
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
  audience: string; // e.g., "public", "connections"
  title: string;
  content: string;
  tags: string[]; // Array of text values
  created_at: string;
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
  major: string;
  avatar: string;
  timestamp: string;
  title?: string;
  content: string;
  tags?: string[];
  audience?: string;
  likes: number;
  comments: number;
}

/**
 * Opportunity type for UI components
 * Used in opportunities component
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
}

/**
 * Profile type for UI components (Network)
 * Used in network component to display user profiles
 */
export interface Profile {
  id: number;
  name: string;
  avatar: string;
  major: string;
  year: string;
  skills: string[];
  bio: string;
  connections: number;
}

/**
 * UserProfile type for UI components (Profile View)
 * Extended user profile with additional UI fields
 */
export interface UserProfile {
  name: string;
  avatar: string;
  major: string;
  year: string;
  email: string;
  skills: string[];
  bio: string;
  connections: number;
  gpa: string;
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
export interface NewPost {
  title: string;
  content: string;
  authorId: string | number;
  tags?: string[];
  audience: string;
}

// ==================== UTILITY TYPES ====================

/**
 * Connection status enum
 */
export type ConnectionStatus = "pending" | "accepted" | "rejected";

/**
 * Post audience enum
 */
export type PostAudience = "public" | "connections" | "private";

/**
 * Partial type for updating user profile
 */
export type UserUpdate = Partial<User>;

/**
 * Partial type for updating project
 */
export type ProjectUpdate = Partial<Omit<Project, "id" | "created_at">>;

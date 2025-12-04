import { supabase } from "@/lib/supabaseClient";
import { Opportunity, Project } from "@/lib/types";

/**
 * Get opportunities from projects table
 * Transforms projects to Opportunity format for UI
 */
export async function getOpportunities(limit: number = 50): Promise<Opportunity[]> {
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching opportunities:", error);
      return [];
    }

    if (!projects) return [];

    // Transform projects to Opportunity format
    const opportunities: Opportunity[] = projects.map((project: Project) => {
      // Format timestamp
      const formatPosted = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        const diffWeeks = Math.floor(diffDays / 7);

        if (diffDays === 0) {
          return "Today";
        } else if (diffDays === 1) {
          return "1 day ago";
        } else if (diffDays < 7) {
          return `${diffDays} days ago`;
        } else if (diffWeeks === 1) {
          return "1 week ago";
        } else if (diffWeeks < 4) {
          return `${diffWeeks} weeks ago`;
        } else {
          return date.toLocaleDateString();
        }
      };

      return {
        id: project.id,
        title: project.title,
        company: project.author || "CMU Project", // Use author as company
        type: project.type || "Project",
        location: "Pittsburgh, PA", // Default location since not in schema
        posted: formatPosted(project.created_at),
        skills: project.skills || [],
        description: project.description || "",
      };
    });

    return opportunities;
  } catch (error) {
    console.error("Error in getOpportunities:", error);
    return [];
  }
}


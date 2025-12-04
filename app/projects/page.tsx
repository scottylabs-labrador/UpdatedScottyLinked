import ProjectWidget from "../_components/projectWidget";
import { getProjects } from "@/lib/db/projects";
import { Project } from "@/lib/types";

export default async function ProjectsPage() {
  let projects: Project[] = await getProjects(5);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">
        Project Opportunities
      </h1>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project, key) => (
          <ProjectWidget project={project} key={key}></ProjectWidget>
        ))}
      </div>
    </main>
  );
}

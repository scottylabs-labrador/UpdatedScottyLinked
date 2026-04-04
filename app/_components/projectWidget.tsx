import { Project } from "@/lib/types";

interface Props {
  project: Project;
}

export default function ProjectWidget(props: Props) {
  let project = props.project;
  return (
    <div
      key={project.id}
      className="rounded-2xl shadow-lg card-surface p-6 transition-transform hover:scale-[1.02] hover:shadow-xl"
    >
      {project.title ? (
        <>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            {project.title}
          </h2>
          <div className="flex flex-row gap-8">
            <div className="text-sm text-[var(--muted)] mb-4">
              Author:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {project.author}
              </span>
            </div>
            <div className="text-sm text-[var(--muted)] mb-4">
              Project Type:{" "}
              <span className="font-medium text-[var(--foreground)]">
                {" "}
                {project.type}{" "}
              </span>
            </div>
          </div>

          {project.skills.length > 0 && (
            <div className="mb-4 flex flex-row">
              <p className="text-sm font-semibold text-[var(--foreground)] mr-2">
                Key Skills:
              </p>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="chip-tag rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-[var(--muted)] text-sm mb-4">{project.description}</p>

          <p className="text-sm text-[var(--foreground)] font-medium">
            <span className="text-[var(--muted)]">Recommended Level:</span>{" "}
            {project.level}
          </p>
        </>
      ) : (
        <div className="flex flex-col justify-center items-center text-[var(--muted)] h-full text-center">
          <p className="text-lg font-medium mb-1">No project data yet</p>
          <p className="text-sm">Waiting for backend data...</p>
        </div>
      )}
    </div>
  );
}

interface Project {
  id: number;
  title: string;
  author: string;
  skills: string[];
  description: string;
  level: string;
  type: string;
}

interface Props {
  project: Project;
}

export default function ProjectWidget(props: Props) {
  let project = props.project;
  return (
    <div
      key={project.id}
      className="rounded-2xl shadow-lg bg-white p-6 transition-transform hover:scale-[1.02] hover:shadow-xl"
    >
      {project.title ? (
        <>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {project.title}
          </h2>
          <div className="flex flex-row gap-8">
            <div className="text-sm text-gray-500 mb-4">
              Author:{" "}
              <span className="font-medium text-gray-800">
                {project.author}
              </span>
            </div>
            <div className="text-sm text-gray-500 mb-4">
              Project Type:{" "}
              <span className="font-medium text-gray-800">
                {" "}
                {project.type}{" "}
              </span>
            </div>
          </div>

          {project.skills.length > 0 && (
            <div className="mb-4 flex flex-row">
              <p className="text-sm font-semibold text-gray-700 mr-2">
                Key Skills:
              </p>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-600 text-sm mb-4">{project.description}</p>

          <p className="text-sm text-gray-700 font-medium">
            <span className="text-gray-500">Recommended Level:</span>{" "}
            {project.level}
          </p>
        </>
      ) : (
        <div className="flex flex-col justify-center items-center text-gray-400 h-full text-center">
          <p className="text-lg font-medium mb-1">No project data yet</p>
          <p className="text-sm">Waiting for backend data...</p>
        </div>
      )}
    </div>
  );
}

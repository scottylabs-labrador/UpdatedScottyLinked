"use client";

import React, { useState, useEffect } from "react";

interface Project {
  id: number;
  title: string;
  owner: string;
  skills: string[];
  description: string;
  level: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([
    {
      id: 1,
      title: "Community Data Visualizer",
      owner: "Jane Smith",
      skills: ["D3", "React", "Data Viz"],
      description:
        "Work with a small team to build interactive visualizations for community datasets. Ideal for students with an interest in front-end and data storytelling.",
      level: "Open to all years",
    },
    { id: 2, title: "", owner: "", skills: [], description: "", level: "" },
    { id: 3, title: "", owner: "", skills: [], description: "", level: "" },
  ]);

  useEffect(() => {
    // fetch('/api/projects') -> setProjects(data)
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">Project Opportunities</h1>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="rounded-2xl shadow-md bg-white p-6 transition-transform hover:scale-[1.02] hover:shadow-lg"
          >
            {project.title ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{project.title}</h2>
                <p className="text-sm text-gray-500 mb-4">Owned by <span className="font-medium">{project.owner}</span></p>

                {project.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Key Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {project.skills.map((skill, index) => (
                        <span key={index} className="bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-gray-600 text-sm mb-4">{project.description}</p>

                <p className="text-sm text-gray-700 font-medium"><span className="text-gray-500">Recommended Level:</span> {project.level}</p>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center text-gray-400 h-full text-center">
                <p className="text-lg font-medium mb-1">No project data yet</p>
                <p className="text-sm">Waiting for backend data...</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

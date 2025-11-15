"use client";

import React, { useState, useEffect } from "react";

interface Job {
  id: number;
  title: string;
  poster: string;
  skills: string[];
  description: string;
  level: string;
}

export default function JobPage() {
  // Example job data for the first card
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1,
      title: "Software Engineering Intern",
      poster: "John Doe",
      skills: ["React", "TypeScript", "Next.js", "APIs"],
      description:
        "Work with our engineering team to build and scale modern web applications. Collaborate on front-end components and API integrations.",
      level: "Recommended for Juniors / Sophomores",
    },
    {
      id: 2,
      title: "",
      poster: "",
      skills: [],
      description: "",
      level: "",
    },
    {
      id: 3,
      title: "",
      poster: "",
      skills: [],
      description: "",
      level: "",
    },
  ]);

  // In the real app, replace with backend API fetch
  useEffect(() => {
    // Example placeholder for backend fetch
    // fetch("/api/jobs")
    //   .then((res) => res.json())
    //   .then((data) => setJobs(data));
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">
        Job Opportunities
      </h1>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="rounded-2xl shadow-md bg-white p-6 transition-transform hover:scale-[1.02] hover:shadow-lg"
          >
            {job.title ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  {job.title}
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Posted by <span className="font-medium">{job.poster}</span>
                </p>

                {job.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Key Skills:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, index) => (
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

                <p className="text-gray-600 text-sm mb-4">{job.description}</p>

                <p className="text-sm text-gray-700 font-medium">
                  <span className="text-gray-500">Recommended Level:</span>{" "}
                  {job.level}
                </p>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center text-gray-400 h-full text-center">
                <p className="text-lg font-medium mb-1">No job data yet</p>
                <p className="text-sm">Waiting for backend data...</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

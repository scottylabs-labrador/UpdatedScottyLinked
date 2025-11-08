"use client";

import React, { useState, useEffect } from "react";

interface Research {
  id: number;
  position: string;
  field: string;
  leadType: string; // Professor-led, PhD-led, Student-led
  experienceNeeded: string;
  skills: string[];
  experience: string; // e.g., "1-2 years"
}

export default function ResearchPage() {
  const [researches, setResearches] = useState<Research[]>([
    {
      id: 1,
      position: "Machine Learning Research Assistant",
      field: "Computer Vision / Medical Imaging",
      leadType: "Professor-led",
      experienceNeeded: "Familiarity with ML frameworks and Python",
      skills: ["Python", "PyTorch", "Data Analysis"],
      experience: "1+ years",
    },
    { id: 2, position: "", field: "", leadType: "", experienceNeeded: "", skills: [], experience: "" },
    { id: 3, position: "", field: "", leadType: "", experienceNeeded: "", skills: [], experience: "" },
  ]);

  useEffect(() => {
    // fetch('/api/research') -> setResearches(data)
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-800">Research Opportunities</h1>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {researches.map((r) => (
          <div key={r.id} className="rounded-2xl shadow-md bg-white p-6 transition-transform hover:scale-[1.02] hover:shadow-lg">
            {r.position ? (
              <>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{r.position}</h2>
                <p className="text-sm text-gray-500 mb-2"><span className="font-medium">Field: </span>{r.field}</p>
                <p className="text-sm text-gray-500 mb-2"><span className="font-medium">Led by: </span>{r.leadType}</p>

                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-700 mb-1">Experience Needed:</p>
                  <p className="text-gray-600 text-sm">{r.experienceNeeded}</p>
                </div>

                {r.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Required Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {r.skills.map((skill, idx) => (
                        <span key={idx} className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-700"><span className="font-medium">Experience:</span> {r.experience}</p>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center text-gray-400 h-full text-center">
                <p className="text-lg font-medium mb-1">No research data yet</p>
                <p className="text-sm">Waiting for backend data...</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

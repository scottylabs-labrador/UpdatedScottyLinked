"use client";

import React, { useState, useEffect } from "react";
import { AppPageContainer } from "@/app/_components/AppShell";
import { Research } from "@/lib/types";

export default function ResearchPage() {
  const [researches, setResearches] = useState<Research[]>([
    {
      id: 1,
      position: "Machine Learning Research Assistant",
      field: "Computer Vision / Medical Imaging",
      leadType: "PhD-led",
      experienceNeeded: "Familiarity with ML frameworks and Python, Sophmore or older prefered",
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
    <AppPageContainer maxWidthClass="max-w-6xl">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-8 text-[var(--foreground)] tracking-tight">
          Research opportunities
        </h1>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {researches.map((r) => (
            <div
              key={r.id}
              className="card-surface p-6 shadow-sm rounded-[var(--radius-card)] transition hover:border-[var(--border)]"
            >
            {r.position ? (
              <>
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">{r.position}</h2>
                <p className="text-sm text-[var(--muted)] mb-2"><span className="font-medium text-[var(--foreground)]">Field: </span>{r.field}</p>
                <p className="text-sm text-[var(--muted)] mb-2"><span className="font-medium text-[var(--foreground)]">Led by: </span>{r.leadType}</p>

                <div className="mb-3">
                  <p className="text-sm font-semibold text-[var(--foreground)] mb-1">Experience Needed:</p>
                  <p className="text-[var(--muted)] text-sm">{r.experienceNeeded}</p>
                </div>

                {r.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-[var(--foreground)] mb-2">Required Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {r.skills.map((skill, idx) => (
                        <span key={idx} className="chip-tag rounded-full">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm text-[var(--foreground)]"><span className="font-medium">Experience:</span> {r.experience}</p>
              </>
            ) : (
              <div className="flex flex-col justify-center items-center text-[var(--muted)] h-full text-center">
                <p className="text-lg font-medium mb-1">No research data yet</p>
                <p className="text-sm">Waiting for backend data...</p>
              </div>
            )}
          </div>
        ))}
        </div>
    </AppPageContainer>
  );
}

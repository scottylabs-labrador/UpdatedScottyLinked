"use client";

import React from 'react';
import { Opportunity } from '../../types';

interface OpportunitiesProps {
  opportunities: Opportunity[];
  loading: boolean;
}

export default function Opportunities({ opportunities, loading }: OpportunitiesProps) {
  if (loading) {
    return <div className="text-center py-8">Loading opportunities...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search and Filter */}
      <div className="mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Search opportunities..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>All Types</option>
          <option>Internships</option>
          <option>Research</option>
          <option>Projects</option>
        </select>
      </div>

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No opportunities available at the moment. Check back soon!
        </div>
      ) : (
        <div className="space-y-4">
          {opportunities.map(opp => (
            <div key={opp.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{opp.title}</h3>
                  <p className="text-gray-600 font-medium">{opp.company}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {opp.type}
                </span>
              </div>
              
              <p className="text-gray-700 mb-4">{opp.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <span>📍 {opp.location}</span>
                <span>⏰ Posted {opp.posted}</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {opp.skills.map((skill: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>

              <button className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                Apply Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
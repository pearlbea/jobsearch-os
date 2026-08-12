"use client";

import { useState, useEffect } from "react";
import { Job, JobSummary } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";
import { EvaluationsList } from "@/components/evaluations-list";

export default function EvaluatorPage() {
  const [jobSummaries, setJobSummaries] = useState<JobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const supabase = createClient();

  // Fetch full job details on demand when selected
  const loadFullJobDetails = async (jobId: string) => {
    setSelectedJobId(jobId);
    setIsDetailLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to load job details");

      setSelectedJob(data.job);
    } catch (err) {
      console.error("Error loading job details:", err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Load saved evaluations on initial mount
  useEffect(() => {
    async function fetchSummaries() {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, role_title, company_name, match_score, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setJobSummaries(data as JobSummary[]);
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setIsListLoading(false);
      }
    }

    fetchSummaries();
  }, []);

  const handleEvaluationComplete = (newJob: Job) => {
    // Add lightweight summary to sidebar list
    const newSummary: JobSummary = {
      id: newJob.id,
      role_title: newJob.role_title,
      company_name: newJob.company_name,
      match_score: newJob.match_score,
      created_at: newJob.created_at,
    };

    setJobSummaries((prev) => [newSummary, ...prev]);
    setSelectedJob(newJob);
    setSelectedJobId(newJob.id);
  };

  const handleDeleteJob = (jobId: string) => {
    const updatedSummaries = jobSummaries.filter((j) => j.id !== jobId);
    setJobSummaries(updatedSummaries);

    if (selectedJobId === jobId) {
      if (updatedSummaries.length > 0) {
        loadFullJobDetails(updatedSummaries[0].id);
      } else {
        setSelectedJob(null);
        setSelectedJobId(null);
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Job Evaluator
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Evaluate job postings against your resume, competencies, and ATS
            filters.
          </p>
        </div>

        {/* Evaluation Input Form */}
        <JobEvaluatorForm onEvaluationComplete={handleEvaluationComplete} />

        {/* Master-Detail Layout */}
        {isListLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading saved evaluations...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Summary Sidebar */}
            <div className="lg:col-span-1">
              <EvaluationsList
                jobs={jobSummaries}
                selectedJobId={selectedJobId}
                onSelectJob={loadFullJobDetails}
                onDeleteJob={handleDeleteJob}
              />
            </div>

            {/* Right: Active Detail View */}
            <div className="lg:col-span-2">
              {isDetailLoading ? (
                <div className="p-12 bg-white border rounded-xl text-center text-sm text-gray-500">
                  Loading evaluation report...
                </div>
              ) : selectedJob ? (
                <EvaluationCard job={selectedJob} />
              ) : (
                <div className="p-12 bg-white border rounded-xl text-center text-gray-400 text-sm">
                  Select an evaluation from the list or submit a new listing.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

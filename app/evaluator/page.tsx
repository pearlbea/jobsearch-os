"use client";

import { useState, useEffect } from "react";
import { Job } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";
import { EvaluationsList } from "@/components/evaluations-list";

export default function EvaluatorPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  // Load saved evaluations on initial mount
  useEffect(() => {
    async function fetchSavedJobs() {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          setJobs(data as Job[]);
          if (data.length > 0) {
            setSelectedJob(data[0] as Job); // Default to most recent
          }
        }
      } catch (err) {
        console.error("Error fetching jobs:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSavedJobs();
  }, []);

  const handleEvaluationComplete = (newJob: Job) => {
    setJobs((prev) => [newJob, ...prev]);
    setSelectedJob(newJob);
  };

  const handleDeleteJob = (jobId: string) => {
    setJobs((prevJobs) => {
      const remaining = prevJobs.filter((j) => j.id !== jobId);
      setSelectedJob((prevSelected) =>
        prevSelected?.id === jobId ? remaining[0] ?? null : prevSelected,
      );
      return remaining;
    });
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

        {/* Input Form */}
        <JobEvaluatorForm onEvaluationComplete={handleEvaluationComplete} />

        {/* Two-Column Layout: History List + Detailed Card View */}
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading saved evaluations...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: History Sidebar */}
            <div className="lg:col-span-1">
              <EvaluationsList
                jobs={jobs}
                selectedJobId={selectedJob?.id || null}
                onSelectJob={(job) => setSelectedJob(job)}
                onDeleteJob={handleDeleteJob}
              />
            </div>

            {/* Right Column: Active Card View */}
            <div className="lg:col-span-2">
              {selectedJob ? (
                <EvaluationCard job={selectedJob} />
              ) : (
                <div className="p-8 bg-white border rounded-xl text-center text-gray-400 text-sm">
                  Select an evaluation from the list or submit a new listing to
                  view the match report.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

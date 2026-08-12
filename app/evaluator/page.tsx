"use client";

import { useState } from "react";
import { Job } from "@/types/database";
import { JobEvaluatorForm } from "@/components/job-evaluator-form";
import { EvaluationCard } from "@/components/evaluation-card";

export default function EvaluatorPage() {
  const [currentJob, setCurrentJob] = useState<Job | null>(null);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Job Evaluator
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Evaluate job postings against your profile requirements, domain
            focus, and story bank.
          </p>
        </div>

        <JobEvaluatorForm onEvaluationComplete={(job) => setCurrentJob(job)} />

        {currentJob && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              Latest Evaluation Result
            </h3>
            <EvaluationCard job={currentJob} />
          </div>
        )}
      </div>
    </main>
  );
}

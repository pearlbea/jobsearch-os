"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const labelClass =
  "block text-[13px] font-semibold text-muted-foreground-strong mb-1.5";
const inputClass =
  "w-full px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground focus:border-primary focus:ring-primary";

// Just enough to create the row; everything else is edited on the job's
// tracker page, where this form sends the user once the job exists.
export default function NewJobForm({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [roleTitle, setRoleTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!roleTitle.trim() || !companyName.trim()) {
      setError("Role title and company name are required.");
      return;
    }
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          user_id: userId,
          role_title: roleTitle.trim(),
          company_name: companyName.trim(),
          job_url: jobUrl.trim() || null,
        })
        .select("id")
        .single();

      if (error) throw error;

      router.push(`/tracker/${data.id}`);
    } catch (err: unknown) {
      console.error("Job create error:", err);
      setError(err instanceof Error ? err.message : "Failed to create job.");
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto p-8 space-y-6 bg-card border border-border rounded-2xl shadow-[0_6px_20px_rgba(60,45,20,0.05)]"
    >
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Add New Job
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          You can add the job description and evaluate it on the next page.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-4 rounded-md text-sm font-medium bg-red-50 text-red-800"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass} htmlFor="new-job-role_title">
            Role Title
          </label>
          <input
            id="new-job-role_title"
            type="text"
            required
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="new-job-company_name">
            Company Name
          </label>
          <input
            id="new-job-company_name"
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="new-job-job_url">
            Job URL (optional)
          </label>
          <input
            id="new-job-job_url"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button type="submit" disabled={isSubmitting} size="lg" className="px-6">
          {isSubmitting ? "Adding..." : "Add Job"}
        </Button>
      </div>
    </form>
  );
}

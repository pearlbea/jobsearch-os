"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ApplicationStatus, Job, WorkMode } from "@/types/database";
import { Button } from "@/components/ui/button";
import { labelOptions, STATUS_LABELS, WORK_MODE_LABELS } from "@/lib/labels";

const STATUS_OPTIONS = labelOptions(STATUS_LABELS);
const WORK_MODE_OPTIONS = labelOptions(WORK_MODE_LABELS);

// Fields this form edits. match_score/evaluation_summary come from the
// evaluator and raw_description drives it, so they aren't editable here.
type TrackerFields = Pick<
  Job,
  | "company_name"
  | "role_title"
  | "location"
  | "job_url"
  | "status"
  | "work_mode"
  | "application_date"
  | "recruiter_initiated"
  | "source"
  | "referral_name"
  | "contact_person"
  | "salary_range"
  | "next_action"
  | "next_action_date"
  | "closed_reason"
  | "notes"
>;

// Inputs hold "" for empty; the database stores null.
type FormValues = {
  [K in keyof TrackerFields]: TrackerFields[K] extends boolean ? boolean : string;
};

function toFormValues(job: Job): FormValues {
  return {
    company_name: job.company_name,
    role_title: job.role_title,
    location: job.location ?? "",
    job_url: job.job_url ?? "",
    status: job.status ?? "",
    work_mode: job.work_mode ?? "",
    application_date: job.application_date ?? "",
    recruiter_initiated: job.recruiter_initiated,
    source: job.source ?? "",
    referral_name: job.referral_name ?? "",
    contact_person: job.contact_person ?? "",
    salary_range: job.salary_range ?? "",
    next_action: job.next_action ?? "",
    next_action_date: job.next_action_date ?? "",
    closed_reason: job.closed_reason ?? "",
    notes: job.notes ?? "",
  };
}

function toPayload(values: FormValues): Partial<Job> {
  const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    company_name: values.company_name.trim(),
    role_title: values.role_title.trim(),
    location: orNull(values.location),
    job_url: orNull(values.job_url),
    status: orNull(values.status) as ApplicationStatus | null,
    work_mode: orNull(values.work_mode) as WorkMode | null,
    application_date: orNull(values.application_date),
    recruiter_initiated: values.recruiter_initiated,
    source: orNull(values.source),
    referral_name: orNull(values.referral_name),
    contact_person: orNull(values.contact_person),
    salary_range: orNull(values.salary_range),
    next_action: orNull(values.next_action),
    next_action_date: orNull(values.next_action_date),
    closed_reason: orNull(values.closed_reason),
    notes: orNull(values.notes),
    updated_at: new Date().toISOString(),
  };
}

const labelClass =
  "block text-[13px] font-semibold text-muted-foreground-strong mb-1.5";
const inputClass =
  "w-full px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground focus:border-primary focus:ring-primary";

export default function JobTrackerForm({ job }: { job: Job }) {
  const router = useRouter();
  const supabase = createClient();

  const [values, setValues] = useState<FormValues>(() => toFormValues(job));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const setField =
    <K extends keyof FormValues>(field: K) =>
    (value: FormValues[K]) =>
      setValues((prev) => ({ ...prev, [field]: value }));

  const textProps = (field: Exclude<keyof FormValues, "recruiter_initiated">) => ({
    id: field,
    name: field,
    value: values[field],
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setField(field)(e.target.value),
  });

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const { data, error } = await supabase
        .from("jobs")
        .update(toPayload(values))
        .eq("id", job.id)
        .eq("user_id", job.user_id)
        .select("id")
        .single();

      if (error) throw error;
      if (!data) throw new Error("Job not found.");

      setMessage({ type: "success", text: "Job updated successfully!" });
      router.refresh();
    } catch (err: unknown) {
      console.error("Job save error:", err);
      const text = err instanceof Error ? err.message : "Failed to save job.";
      setMessage({ type: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto p-8 space-y-8 bg-card border border-border rounded-2xl shadow-[0_6px_20px_rgba(60,45,20,0.05)]"
    >
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          {job.role_title}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">{job.company_name}</p>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Role */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="text-sm font-bold text-foreground mb-3">Role</legend>
        <div>
          <label className={labelClass} htmlFor="role_title">
            Role Title
          </label>
          <input type="text" required className={inputClass} {...textProps("role_title")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="company_name">
            Company Name
          </label>
          <input type="text" required className={inputClass} {...textProps("company_name")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="location">
            Location
          </label>
          <input type="text" className={inputClass} {...textProps("location")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="work_mode">
            Work Mode
          </label>
          <select className={inputClass} {...textProps("work_mode")}>
            <option value="">Not specified</option>
            {WORK_MODE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="salary_range">
            Salary Range
          </label>
          <input
            type="text"
            placeholder="e.g. $150k–$180k + equity"
            className={inputClass}
            {...textProps("salary_range")}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="job_url">
            Job URL
          </label>
          <input type="url" className={inputClass} {...textProps("job_url")} />
        </div>
      </fieldset>

      {/* Application */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="text-sm font-bold text-foreground mb-3">
          Application
        </legend>
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select className={inputClass} {...textProps("status")}>
            <option value="">No status</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="application_date">
            Application Date
          </label>
          <input type="date" className={inputClass} {...textProps("application_date")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="source">
            Source
          </label>
          <input
            type="text"
            placeholder="e.g. LinkedIn, referral, company site"
            className={inputClass}
            {...textProps("source")}
          />
        </div>
        <div className="flex items-center gap-2 sm:pt-7">
          <input
            type="checkbox"
            id="recruiter_initiated"
            name="recruiter_initiated"
            checked={values.recruiter_initiated}
            onChange={(e) => setField("recruiter_initiated")(e.target.checked)}
            className="size-4 accent-primary"
          />
          <label
            className="text-[13px] font-semibold text-muted-foreground-strong"
            htmlFor="recruiter_initiated"
          >
            Recruiter reached out first
          </label>
        </div>
        <div>
          <label className={labelClass} htmlFor="contact_person">
            Contact Person
          </label>
          <input type="text" className={inputClass} {...textProps("contact_person")} />
        </div>
        <div>
          <label className={labelClass} htmlFor="referral_name">
            Referral
          </label>
          <input type="text" className={inputClass} {...textProps("referral_name")} />
        </div>
      </fieldset>

      {/* Follow-up */}
      <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <legend className="text-sm font-bold text-foreground mb-3">
          Follow-up
        </legend>
        <div>
          <label className={labelClass} htmlFor="next_action">
            Next Action
          </label>
          <input
            type="text"
            placeholder="e.g. Follow up with recruiter"
            className={inputClass}
            {...textProps("next_action")}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="next_action_date">
            Next Action Date
          </label>
          <input type="date" className={inputClass} {...textProps("next_action_date")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="closed_reason">
            Closed Reason
          </label>
          <input
            type="text"
            placeholder="e.g. Rejected after onsite, withdrew, no response"
            className={inputClass}
            {...textProps("closed_reason")}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            rows={5}
            className="w-full px-3.5 py-3 border border-[#E2DACB] rounded-[10px] text-sm text-foreground font-sans focus:border-primary focus:ring-primary"
            {...textProps("notes")}
          />
        </div>
      </fieldset>

      <div className="pt-4 border-t border-border flex justify-end">
        <Button type="submit" disabled={isSubmitting} size="lg" className="px-6">
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

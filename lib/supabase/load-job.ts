import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/types/database";

const NOT_FOUND_CODES = new Set(["PGRST116", "22P02"]);

// The query is separate from unwrapJob so pages can run it in parallel with
// their other queries.
export function jobQuery(supabase: SupabaseClient, userId: string, jobId: string) {
  return supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();
}

// Only a missing row is a 404: PGRST116 is .single() matching no rows
// (including another user's job), 22P02 is a job_id that isn't a UUID.
// Anything else is a real failure and goes to the error page.
export function unwrapJob({
  data,
  error,
}: {
  data: Job | null;
  error: { code: string } | null;
}): Job {
  if (error && !NOT_FOUND_CODES.has(error.code)) throw error;
  if (!data) notFound();
  return data;
}

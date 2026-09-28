import type {
  ApplicationStatus,
  InteractionKind,
  InteractionOutcome,
  WorkMode,
} from "@/types/database";

// Display labels for each enum-like column. Typed as Record<Union, string> so
// adding a value to a union in types/database.ts is a compile error until it
// gets a label here — and, via labelOptions, shows up in every dropdown.
// Key order is display order.

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  bookmarked: "Bookmarked",
  outreach_sent: "Outreach Sent",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  archived: "Archived",
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "Onsite",
};

export const INTERACTION_KIND_LABELS: Record<InteractionKind, string> = {
  recruiter_screen: "Recruiter Screen",
  hiring_manager: "Hiring Manager",
  technical: "Technical",
  panel: "Panel",
  take_home: "Take-Home",
  onsite: "Onsite",
  offer_call: "Offer Call",
  email: "Email",
  other: "Other",
};

export const INTERACTION_OUTCOME_LABELS: Record<InteractionOutcome, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  passed: "Passed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** A label map as `<option>`-ready `{ value, label }` pairs, in key order. */
export function labelOptions<K extends string>(
  labels: Record<K, string>,
): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

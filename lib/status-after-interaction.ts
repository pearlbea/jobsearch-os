import type {
  ApplicationStatus,
  InteractionKind,
  InteractionOutcome,
} from "@/types/database";

// Completing an interaction can advance the job's status. Returns the new
// status, or null when the job should stay where it is.
export function statusAfterInteraction(
  kind: InteractionKind,
  outcome: InteractionOutcome | null,
  status: ApplicationStatus | null,
): ApplicationStatus | null {
  if (outcome !== "completed") return null;
  if (kind === "outreach" && status === "bookmarked") return "outreach_sent";
  if (
    kind === "recruiter_screen" &&
    (status === "bookmarked" || status === "outreach_sent" || status === "applied")
  ) {
    return "interviewing";
  }
  return null;
}

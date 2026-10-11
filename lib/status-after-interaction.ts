import type {
  ApplicationStatus,
  InteractionKind,
  InteractionOutcome,
} from "@/types/database";

// Completing an interaction of a given kind moves the job to `to`, but only
// from one of the `from` statuses.
const TRANSITIONS: Partial<
  Record<
    InteractionKind,
    { from: readonly ApplicationStatus[]; to: ApplicationStatus }
  >
> = {
  outreach: { from: ["bookmarked"], to: "outreach_sent" },
  recruiter_screen: {
    from: ["bookmarked", "outreach_sent", "applied"],
    to: "interviewing",
  },
};

// Completing an interaction can advance the job's status. Returns the new
// status and the statuses it may be advanced from, or null when the job
// should stay where it is. Callers should make the write conditional on
// `from` so a status changed elsewhere since it was read isn't overwritten.
export function statusTransitionAfterInteraction(
  kind: InteractionKind,
  outcome: InteractionOutcome | null,
  status: ApplicationStatus | null,
): { to: ApplicationStatus; from: readonly ApplicationStatus[] } | null {
  if (outcome !== "completed" || !status) return null;
  const transition = TRANSITIONS[kind];
  if (!transition?.from.includes(status)) return null;
  return transition;
}

export function statusAfterInteraction(
  kind: InteractionKind,
  outcome: InteractionOutcome | null,
  status: ApplicationStatus | null,
): ApplicationStatus | null {
  return statusTransitionAfterInteraction(kind, outcome, status)?.to ?? null;
}

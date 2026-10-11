import { describe, it, expect } from "vitest";
import { statusAfterInteraction } from "./status-after-interaction";

describe("statusAfterInteraction", () => {
  it("moves a bookmarked job to outreach_sent when outreach completes", () => {
    expect(statusAfterInteraction("outreach", "completed", "bookmarked")).toBe(
      "outreach_sent",
    );
  });

  it.each(["outreach_sent", "applied", "interviewing", null] as const)(
    "leaves a %s job alone when outreach completes",
    (status) => {
      expect(statusAfterInteraction("outreach", "completed", status)).toBeNull();
    },
  );

  it.each(["bookmarked", "outreach_sent", "applied"] as const)(
    "moves a %s job to interviewing when a recruiter screen completes",
    (status) => {
      expect(
        statusAfterInteraction("recruiter_screen", "completed", status),
      ).toBe("interviewing");
    },
  );

  it.each(["interviewing", "offer", "rejected", "withdrawn", "archived", null] as const)(
    "leaves a %s job alone when a recruiter screen completes",
    (status) => {
      expect(
        statusAfterInteraction("recruiter_screen", "completed", status),
      ).toBeNull();
    },
  );

  it("ignores interactions that aren't completed", () => {
    expect(statusAfterInteraction("outreach", "scheduled", "bookmarked")).toBeNull();
    expect(statusAfterInteraction("recruiter_screen", null, "applied")).toBeNull();
  });

  it("ignores other kinds", () => {
    expect(statusAfterInteraction("technical", "completed", "bookmarked")).toBeNull();
  });
});

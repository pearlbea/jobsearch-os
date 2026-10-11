import { describe, it, expect } from "vitest";
import { validateTalkingPoints } from "./validate-talking-points";

const resume =
  "Cut load time 40% at Acme. Saved $2M. Grew team to 15k users, 3M events.";
const p = (say: string, basis = "Acme") => ({ say, basis });

describe("validateTalkingPoints", () => {
  it("keeps points whose numbers all appear in the resume", () => {
    const { kept, dropped } = validateTalkingPoints(
      [p("I cut load time 40 percent at Acme.")],
      resume,
    );
    expect(kept).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("keeps points with no numbers", () => {
    expect(
      validateTalkingPoints([p("I led the migration.")], resume).kept,
    ).toHaveLength(1);
  });

  it("drops a point with an absent number in say", () => {
    const { kept, dropped } = validateTalkingPoints(
      [p("I cut costs 60%.")],
      resume,
    );
    expect(kept).toHaveLength(0);
    expect(dropped).toEqual([
      expect.objectContaining({ reason: "number_in_say", number: "60" }),
    ]);
  });

  it("drops a point with an absent number in basis", () => {
    const { dropped } = validateTalkingPoints(
      [p("I led it.", "8 years at Acme")],
      resume,
    );
    expect(dropped[0].reason).toBe("number_in_basis");
  });

  it("drops a number that appears only in the job posting", () => {
    expect(
      validateTalkingPoints([p("I have 5+ years of React.")], resume).dropped,
    ).toHaveLength(1);
  });

  it("handles $, k and M forms", () => {
    const ok = validateTalkingPoints(
      [p("I saved $2M and served 15k users, 3M events.")],
      resume,
    );
    expect(ok.kept).toHaveLength(1);
    const bad = validateTalkingPoints([p("I saved $9M.")], resume);
    expect(bad.dropped).toHaveLength(1);
  });

  it("matches the same value across formats", () => {
    const r =
      "Processed 1,500,000 events and saved $1.5 million; cut errors 40.";
    const ok = validateTalkingPoints(
      [p("I processed 1.5M events, saved $1.5M, and cut errors 40%.")],
      r,
    );
    expect(ok.kept).toHaveLength(1);
    const reverse = validateTalkingPoints(
      [p("I processed 1,500,000 events.")],
      "Processed 1.5M events.",
    );
    expect(reverse.kept).toHaveLength(1);
  });

  it("ignores digits that are part of a name", () => {
    const { kept } = validateTalkingPoints(
      [p("I built on S3 and OAuth2 in Q3 using Web3.", "i18n work")],
      "no figures here",
    );
    expect(kept).toHaveLength(1);
  });

  it("treats commas as thousands separators only", () => {
    expect(
      validateTalkingPoints([p("I handled 3, 4 and 5 teams.")], "3 4 5").kept,
    ).toHaveLength(1);
    expect(
      validateTalkingPoints([p("I handled 3,4 teams.")], "34 teams").dropped,
    ).toHaveLength(1);
  });

  it("handles a null resume", () => {
    expect(
      validateTalkingPoints([p("I did 5 things.")], null).dropped,
    ).toHaveLength(1);
  });
});

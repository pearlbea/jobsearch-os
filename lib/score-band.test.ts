import { describe, expect, it } from "vitest";
import { getScoreBand } from "./score-band";

describe("getScoreBand", () => {
  it.each([
    [0, "poor"],
    [49, "poor"],
    [50, "stretch"],
    [69, "stretch"],
    [70, "good"],
    [84, "good"],
    [85, "strong"],
    [100, "strong"],
  ] as const)("puts %i in the %s band", (score, band) => {
    expect(getScoreBand(score)).toBe(band);
  });
});

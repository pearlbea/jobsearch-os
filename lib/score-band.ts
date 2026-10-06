export type ScoreBand = "poor" | "stretch" | "good" | "strong";

export interface BandStyle {
  /** Overall fit label, e.g. on the main badge and in evaluation history. */
  label: string;
  /** One-word form for a single breakdown dimension. */
  shortLabel: string;
  /** Fill, text, and border for a badge (add `border` for the width). */
  badgeClassName: string;
  /** Fill for a breakdown bar. */
  barClassName: string;
  /** Text in the bar's color, for the label beside it. */
  barTextClassName: string;
}

// Colors are the --band-* variables in app/globals.css. Class names are
// written out in full so Tailwind can find them.
export const bandStyles: Record<ScoreBand, BandStyle> = {
  poor: {
    label: "Poor fit",
    shortLabel: "Poor",
    badgeClassName: "bg-band-poor-bg text-band-poor border-band-poor/20",
    barClassName: "bg-band-poor-bar",
    barTextClassName: "text-band-poor-bar",
  },
  stretch: {
    label: "Stretch",
    shortLabel: "Stretch",
    badgeClassName: "bg-band-stretch-bg text-band-stretch border-band-stretch/20",
    barClassName: "bg-band-stretch-bar",
    barTextClassName: "text-band-stretch-bar",
  },
  good: {
    label: "Good fit",
    shortLabel: "Good",
    badgeClassName: "bg-band-good-bg text-band-good border-band-good/20",
    barClassName: "bg-band-good-bar",
    barTextClassName: "text-band-good-bar",
  },
  strong: {
    label: "Strong fit",
    shortLabel: "Strong",
    badgeClassName: "bg-band-strong-bg text-band-strong border-band-strong/20",
    barClassName: "bg-band-strong-bar",
    barTextClassName: "text-band-strong-bar",
  },
};

// The numeric score is still computed and stored, but the UI only shows its
// band: run-to-run variation is a few points (see `npm run eval`), so the
// exact number implies precision it doesn't have. Cutoffs sit where the eval
// fixtures' scores cluster away from them, so a re-run rarely flips the label.
export function getScoreBand(score: number): ScoreBand {
  if (score < 50) return "poor";
  if (score < 70) return "stretch";
  if (score < 85) return "good";
  return "strong";
}

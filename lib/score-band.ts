export type ScoreBand = "poor" | "stretch" | "good" | "strong";

export interface BandStyle {
  /** Overall fit label, e.g. on the main badge and in evaluation history. */
  label: string;
  /** One-word form for a single breakdown dimension. */
  shortLabel: string;
  /** Hex values for the score badge, where Tailwind tokens don't apply. */
  badgeBg: string;
  badgeColor: string;
  /** Hex value for individual breakdown bars (label text + fill). */
  barColor: string;
}

// Badge colors for each band live here. components/ui/badge.tsx's band
// variants read badgeBg/badgeColor from this map directly (rather than their
// own Tailwind classes), so a band renders identically whether it's this
// Badge component (list rows) or the inline styles used elsewhere (main
// score badge, landing page preview).
export const bandStyles: Record<ScoreBand, BandStyle> = {
  poor: {
    label: "Poor fit",
    shortLabel: "Poor",
    badgeBg: "#FDECEC",
    badgeColor: "#C0392B",
    barColor: "#C0392B",
  },
  stretch: {
    label: "Stretch",
    shortLabel: "Stretch",
    badgeBg: "#FEF3C7",
    badgeColor: "#92400E",
    barColor: "#9D681B",
  },
  good: {
    label: "Good fit",
    shortLabel: "Good",
    badgeBg: "#EAF7EF",
    badgeColor: "#1E7A4C",
    barColor: "#1E7A4C",
  },
  // Filled rather than tinted, so it reads as a step above "good".
  strong: {
    label: "Strong fit",
    shortLabel: "Strong",
    badgeBg: "#1E7A4C",
    badgeColor: "#FFFFFF",
    barColor: "#155C39",
  },
};

export const SCORE_BANDS: readonly ScoreBand[] = [
  "poor",
  "stretch",
  "good",
  "strong",
];

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

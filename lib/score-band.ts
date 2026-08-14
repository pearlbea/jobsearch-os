export type ScoreBand = "low" | "medium" | "high";

export interface BandStyle {
  label: string;
  /** Hex values for the score badge, where Tailwind tokens don't apply. */
  badgeBg: string;
  badgeColor: string;
  /** Hex value for individual breakdown bars (label text + fill). */
  barColor: string;
}

// Badge colors for each band live here. components/ui/badge.tsx's
// low/medium/high variants read badgeBg/badgeColor from this map directly
// (rather than their own Tailwind classes), so a band renders identically
// whether it's this Badge component (list rows) or the inline styles used
// elsewhere (main score badge, ATS status pill).
export const bandStyles: Record<ScoreBand, BandStyle> = {
  low: {
    label: "Low fit",
    badgeBg: "#FDECEC",
    badgeColor: "#C0392B",
    barColor: "#C0392B",
  },
  medium: {
    label: "Medium fit",
    badgeBg: "#FEF3C7",
    badgeColor: "#92400E",
    barColor: "#9D681B",
  },
  high: {
    label: "High fit",
    badgeBg: "#EAF7EF",
    badgeColor: "#1E7A4C",
    barColor: "#1E7A4C",
  },
};

export function getScoreBand(score: number): ScoreBand {
  if (score < 40) return "low";
  if (score <= 70) return "medium";
  return "high";
}

export function getAtsBand(passProbability: "High" | "Medium" | "Low"): ScoreBand {
  if (passProbability === "High") return "high";
  if (passProbability === "Medium") return "medium";
  return "low";
}

export type ScoreBand = "low" | "medium" | "high";

export interface BandStyle {
  label: string;
  /** Hex value for SVG stroke, where Tailwind classes don't apply. */
  ring: string;
}

// Badge colors for each band live in components/ui/badge.tsx's cva variants
// (variant names match ScoreBand 1:1) — this only owns the ring hex + label.
export const bandStyles: Record<ScoreBand, BandStyle> = {
  low: {
    label: "Low fit",
    ring: "#e11d48",
  },
  medium: {
    label: "Medium fit",
    ring: "#f59e0b",
  },
  high: {
    label: "High fit",
    ring: "#22c55e",
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

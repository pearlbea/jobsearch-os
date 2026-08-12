import { bandStyles, getScoreBand } from "@/lib/score-band";

interface ScoreRingProps {
  score: number;
  size?: number;
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreRing({ score, size = 96 }: ScoreRingProps) {
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
  const band = getScoreBand(safeScore);
  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * safeScore) / 100;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Match score: ${safeScore}%`}>
      <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#f4f4f5" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={RADIUS}
        fill="none"
        stroke={bandStyles[band].ring}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="56"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="#18181b"
      >
        {safeScore}%
      </text>
    </svg>
  );
}

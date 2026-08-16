import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] bg-primary">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="#ffffff"
          strokeWidth={2}
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      </span>
      <span className="text-base font-bold tracking-tight text-foreground">
        JobFit Scorecard
      </span>
    </Link>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackToTrackerLink() {
  return (
    <div className="max-w-3xl mx-auto mb-4">
      <Link
        href="/tracker"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Job Tracker
      </Link>
    </div>
  );
}

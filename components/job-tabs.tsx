"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function JobTabs({ jobId }: { jobId: string }) {
  const pathname = usePathname();
  const base = `/tracker/${jobId}`;
  const tabs = [
    { href: base, label: "Tracking" },
    { href: `${base}/evaluation`, label: "Evaluation" },
    { href: `${base}/conversations`, label: "Conversations" },
  ];

  return (
    <nav aria-label="Job sections" className="max-w-3xl mx-auto mb-6">
      <ul className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-block px-4 py-2 -mb-px text-sm font-semibold border-b-2",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

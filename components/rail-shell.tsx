"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import { HistoryModal } from "@/components/history-modal";

interface RailShellProps {
  userEmail: string;
  children: React.ReactNode;
}

// Items with an `href` are real routes; the item without one (History) opens
// a modal in place instead of navigating away.
const NAV_ITEMS: Array<{ label: string; href?: string }> = [
  { label: "Evaluate", href: "/evaluator" },
  { label: "History" },
  { label: "Profile", href: "/profile" },
];

export function RailShell({ userEmail, children }: RailShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleSelectJob = (jobId: string) => {
    setIsHistoryOpen(false);
    router.push(`/evaluator?job=${jobId}`);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:min-h-full">
      {/* Mobile: sticky top header + pill tabs */}
      <div className="sm:hidden sticky top-0 z-10 bg-background border-b border-border flex flex-col gap-2.5 px-4 py-3.5">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-extrabold text-sm tracking-tight">
            JobSearch OS
          </Link>
          <SignOutButton className="h-auto p-0 text-xs font-semibold text-foreground hover:bg-transparent hover:underline" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href ? pathname === item.href : isHistoryOpen;
            const className = cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold",
              isActive ? "bg-zinc-900 text-white" : "text-zinc-600",
            );

            if (item.href) {
              return (
                <Link key={item.label} href={item.href} className={className}>
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className={className}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: sticky left rail */}
      <div
        className="hidden sm:flex sm:sticky sm:top-0 sm:self-start sm:h-screen w-[216px] shrink-0 border-r border-border flex-col justify-between px-4 py-5"
      >
        <div className="flex flex-col gap-6">
          <Link href="/" className="font-extrabold text-[15px] tracking-tight px-1">
            JobSearch OS
          </Link>
          <nav className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href ? pathname === item.href : isHistoryOpen;
              const className = cn(
                "flex items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13.5px]",
                isActive
                  ? "bg-zinc-900 text-white font-semibold"
                  : "text-zinc-600 font-medium",
              );
              const dot = (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isActive ? "bg-white" : "bg-zinc-300",
                  )}
                />
              );

              if (item.href) {
                return (
                  <Link key={item.label} href={item.href} className={className}>
                    {dot}
                    {item.label}
                  </Link>
                );
              }

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className={className}
                >
                  {dot}
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-1 px-1">
          <span className="text-[12.5px] text-zinc-600 truncate">{userEmail}</span>
          <SignOutButton className="h-auto w-fit p-0 justify-start text-[12.5px] font-semibold text-zinc-900 hover:bg-transparent hover:underline" />
        </div>
      </div>

      <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>

      <HistoryModal
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        onSelectJob={handleSelectJob}
      />
    </div>
  );
}

import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { RailShell } from "@/components/rail-shell";

const PREVIEW_BARS = [
  { label: "Technical Match", value: 40, color: "#B7791F" },
  { label: "Domain Match", value: 20, color: "#C0392B" },
  { label: "Leadership / Scope", value: 25, color: "#C0392B" },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const loggedIn = user && !authError ? user : null;

  const { data: profile, error: profileError } = loggedIn
    ? await supabase
        .from("profiles")
        .select("*")
        .eq("id", loggedIn.id)
        .single()
    : { data: null, error: null };

  // PGRST116 just means "no profile row yet" (expected pre-onboarding);
  // any other error is unexpected and shouldn't be silently treated as that.
  if (loggedIn && profileError && profileError.code !== "PGRST116") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 text-center">
        <p className="text-muted-foreground">
          Something went wrong loading your profile. Please refresh the page.
        </p>
      </div>
    );
  }

  if (!loggedIn || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-[1040px] w-full">
          <Logo className="mb-10" />

          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-7 md:gap-12 items-center mb-11">
            <div>
              <h1 className="text-[26px] md:text-[34px] font-extrabold leading-[1.3] tracking-tight mb-4 text-foreground">
                Know where you stand before you apply
              </h1>
              <p className="text-base text-[#5C564C] leading-relaxed">
                JobSearch OS matches your background against job postings you
                paste in, scoring fit and flagging gaps so you know where you
                stand before you apply.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_10px_28px_rgba(60,45,20,0.08)] -rotate-1">
              <div className="flex justify-between items-center mb-3.5">
                <div>
                  <div className="text-[13px] font-bold text-foreground">
                    Software Developer
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    Tulsa City-County Library
                  </div>
                </div>
                <div className="text-center bg-[#FDECEC] border border-[#F7C9C9] rounded-lg px-3 py-1.5">
                  <div className="text-[15px] font-extrabold text-[#C0392B] leading-none">
                    32%
                  </div>
                </div>
              </div>
              {PREVIEW_BARS.map((bar) => (
                <div key={bar.label} className="mb-2.5">
                  <div className="flex justify-between text-[11px] text-[#6B7280] mb-1">
                    <span>{bar.label}</span>
                    <span>{bar.value}%</span>
                  </div>
                  <div className="h-[5px] bg-[#F1F2F4] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${bar.value}%`, background: bar.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card py-9 px-8 md:px-10 shadow-[0_6px_20px_rgba(60,45,20,0.06)] mb-6">
            <h2 className="text-[22px] font-extrabold tracking-tight mb-2 text-foreground">
              First, let&apos;s set up your profile
            </h2>
            <p className="text-[15px] text-muted-foreground mb-[22px]">
              Add your resume, target roles, and skills — takes about two
              minutes.
            </p>
            <div className="flex items-center gap-4">
              <Button
                render={<Link href="/profile" />}
                nativeButton={false}
                size="lg"
                className="px-6"
              >
                Create your profile
              </Button>
              {!loggedIn && (
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Already have a profile? Sign in
                </Link>
              )}
            </div>
          </div>

          <div className="flex gap-2 items-start px-1">
            <TriangleAlert className="h-[15px] w-[15px] shrink-0 mt-0.5 text-[#BE854A]" />
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              This is a demo with a limited token budget. Each user is limited
              to 5 evaluations. You are welcome to clone{" "}
              <Link
                href="https://github.com/pearlbea/jobsearch-os"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground underline underline-offset-2"
              >
                the repo
              </Link>{" "}
              and run your own instance if you want to evaluate more jobs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RailShell userEmail={loggedIn.email ?? ""}>
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground mb-6">
          Welcome back, {profile.full_name || loggedIn.email}.
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/profile"
            className="block rounded-2xl border border-border bg-card p-6 shadow-[0_6px_20px_rgba(60,45,20,0.05)] transition-colors hover:border-primary/40"
          >
            <h2 className="text-lg font-bold text-foreground">Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View or update your resume, target roles, and skills.
            </p>
          </Link>
          <Link
            href="/evaluator"
            className="block rounded-2xl border border-border bg-card p-6 shadow-[0_6px_20px_rgba(60,45,20,0.05)] transition-colors hover:border-primary/40"
          >
            <h2 className="text-lg font-bold text-foreground">Job Evaluator</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluate job postings against your profile.
            </p>
          </Link>
        </div>
      </div>
    </RailShell>
  );
}

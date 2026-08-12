import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-3xl font-semibold text-foreground">
          Land your next role, faster.
        </h1>
        <p className="text-muted-foreground">
          Sign in to build your profile and evaluate job postings against it.
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Sign in
        </Button>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Set up your candidate profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add your resume, target roles, and skills so we can match you
            against job postings.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button render={<Link href="/profile" />} nativeButton={false}>
            Create your profile
          </Button>
          <Link
            href="/evaluator"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip to the evaluator
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Welcome back, {profile.full_name || user.email}.
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/profile"
          className="block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40"
        >
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View or update your resume, target roles, and skills.
          </p>
        </Link>
        <Link
          href="/evaluator"
          className="block rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/40"
        >
          <h2 className="text-lg font-semibold text-foreground">
            Job Evaluator
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Evaluate job postings against your profile.
          </p>
        </Link>
      </div>
    </div>
  );
}

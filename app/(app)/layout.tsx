import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RailShell } from "@/components/rail-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  return <RailShell userEmail={user.email ?? ""}>{children}</RailShell>;
}

import { requireUser } from "@/lib/supabase/auth";
import { RailShell } from "@/components/rail-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireUser();

  return <RailShell userEmail={user.email ?? ""}>{children}</RailShell>;
}

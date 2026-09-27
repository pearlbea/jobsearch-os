import { requireUser } from "@/lib/supabase/auth";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <ProfileForm
      initialProfile={profile}
      userId={user.id}
      userEmail={user.email || ""}
    />
  );
}

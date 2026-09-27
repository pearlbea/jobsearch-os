import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  return { supabase, user };
});

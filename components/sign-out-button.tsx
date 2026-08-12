"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps = {}) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out failed:", error);
      return;
    }

    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSignOut}
      className={cn(className)}
    >
      Sign out
    </Button>
  );
}

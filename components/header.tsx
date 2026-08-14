import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  showSignIn?: boolean;
}

export function Header({ showSignIn = true }: HeaderProps = {}) {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
        <Logo />
        {showSignIn && (
          <Button render={<Link href="/login" />} nativeButton={false} size="sm">
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}

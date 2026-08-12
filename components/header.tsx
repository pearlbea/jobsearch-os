import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-foreground">
          JobSearch OS
        </Link>

        <Button
          render={<Link href="/login" />}
          nativeButton={false}
          variant="outline"
          size="sm"
        >
          Sign in
        </Button>
      </div>
    </header>
  );
}

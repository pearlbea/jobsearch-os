import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center">
        <Link href="/" className="text-lg font-semibold text-foreground">
          JobSearch OS
        </Link>
      </div>
    </header>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Header } from "@/components/header";
import { RailShell } from "@/components/rail-shell";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JobSearch OS",
  description:
    "Evaluate job postings against your profile and track your search.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
      )}
    >
      <body className="min-h-full max-w-7xl mx-auto flex flex-col">
        {user ? (
          <RailShell userEmail={user.email ?? ""}>{children}</RailShell>
        ) : (
          <>
            <Header />
            <main className="flex-1 px-4 py-10 max-w-2xl mx-auto">
              {children}
            </main>
          </>
        )}
      </body>
    </html>
  );
}

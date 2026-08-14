import { Header } from "@/components/header";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="flex-1 px-4 py-10 max-w-2xl mx-auto w-full">
        {children}
      </main>
    </>
  );
}

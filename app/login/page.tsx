"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setMessage({
            type: "success",
            text: "Account created. Check your email to confirm before signing in.",
          });
        }
      }
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      setMessage({ type: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm mx-auto space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {mode === "sign-in" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Access your job search dashboard.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label
            className="mb-1 block text-sm font-semibold text-foreground"
            htmlFor="email"
          >
            Email
          </label>
          <input
            autoComplete="email"
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            className="mb-1 block text-sm font-semibold text-foreground"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative">
            <input
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              type={isPasswordVisible ? "text" : "password"}
              required
              minLength={mode === "sign-up" ? 12 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 pr-10 text-sm shadow-sm focus:border-primary focus:ring-primary"
              placeholder="••••••••"
              id="password"
            />
            <button
              type="button"
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            >
              {isPasswordVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {mode === "sign-up" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Must be at least 12 characters.
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting
          ? "Please wait..."
          : mode === "sign-in"
            ? "Sign in"
            : "Sign up"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMessage(null);
          setMode(mode === "sign-in" ? "sign-up" : "sign-in");
        }}
        className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "sign-in"
          ? "Need an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

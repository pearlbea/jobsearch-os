"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";
import { Button } from "@/components/ui/button";

interface ProfileFormProps {
  initialProfile: Profile | null;
  userId: string;
  userEmail: string;
}

export function ProfileForm({
  initialProfile,
  userId,
  userEmail,
}: ProfileFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState(initialProfile?.full_name || "");
  const [resumeText, setResumeText] = useState(initialProfile?.resume || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        id: userId,
        full_name: fullName,
        email: userEmail,
        resume: resumeText,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
      router.refresh();
    } catch (err: unknown) {
      console.error("Profile save error:", err);
      const text =
        err instanceof Error ? err.message : "Failed to save profile.";
      setMessage({ type: "error", text });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto p-8 space-y-8 bg-card border border-border rounded-2xl shadow-[0_6px_20px_rgba(60,45,20,0.05)]"
    >
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
          Candidate Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This data powers the AI evaluation engine when scoring job postings
          against your background.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Name & Location */}

      <div>
        <label className="block text-[13px] font-semibold text-muted-foreground-strong mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground focus:border-primary focus:ring-primary"
          placeholder="e.g. Jane Doe"
        />
      </div>

      {/* Resume */}
      <div>
        <label className="block text-[13px] font-semibold text-muted-foreground-strong mb-1.5">
          Resume / Core Background
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Your name, email, phone number, and website are automatically stripped
          out before your resume is shared with the AI evaluator.
        </p>
        <textarea
          rows={6}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume here"
          className="w-full px-3.5 py-3 border border-[#E2DACB] rounded-[10px] text-sm text-foreground font-sans focus:border-primary focus:ring-primary"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t border-border flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          size="lg"
          className="px-6"
        >
          {isSubmitting ? "Saving Profile..." : "Save Profile"}
        </Button>
      </div>
    </form>
  );
}

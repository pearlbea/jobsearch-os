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
  const [targetTitles, setTargetTitles] = useState<string[]>(
    initialProfile?.target_titles || [
      "Engineering Manager",
      "Senior Full-Stack Engineer",
    ],
  );
  const [newTitleInput, setNewTitleInput] = useState("");

  const [locationPreference, setLocationPreference] = useState(
    initialProfile?.location_preference || "Remote (or Tulsa, OK)",
  );
  const [resumeText, setResumeText] = useState(initialProfile?.resume || "");

  const [technicalSkills, setTechnicalSkills] = useState<string[]>(
    initialProfile?.technical_skills || [
      "TypeScript",
      "Next.js",
      "Supabase",
      "Python",
      "Go",
    ],
  );
  const [newSkillInput, setNewSkillInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Helper: Tag management
  const addTag = (
    input: string,
    setInput: (val: string) => void,
    list: string[],
    setList: (val: string[]) => void,
  ) => {
    const trimmed = input.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setInput("");
    }
  };

  const removeTag = (
    item: string,
    list: string[],
    setList: (val: string[]) => void,
  ) => {
    setList(list.filter((t) => t !== item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        id: userId,
        full_name: fullName,
        email: userEmail,
        target_titles: targetTitles,
        location_preference: locationPreference,
        resume: resumeText,
        technical_skills: technicalSkills,
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[13px] font-semibold text-[#5C564C] mb-1.5">
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

        <div>
          <label className="block text-[13px] font-semibold text-[#5C564C] mb-1.5">
            Location Preference
          </label>
          <input
            type="text"
            value={locationPreference}
            onChange={(e) => setLocationPreference(e.target.value)}
            className="w-full px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground focus:border-primary focus:ring-primary"
            placeholder="e.g. Remote or Tulsa, OK"
          />
        </div>
      </div>

      {/* Target Titles (Array Input) */}
      <div>
        <label className="block text-[13px] font-semibold text-[#5C564C] mb-1.5">
          Target Roles / Titles
        </label>
        <div className="flex gap-2 mb-2.5">
          <input
            type="text"
            value={newTitleInput}
            onChange={(e) => setNewTitleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(
                  newTitleInput,
                  setNewTitleInput,
                  targetTitles,
                  setTargetTitles,
                );
              }
            }}
            placeholder="Add title (e.g. Technical Program Manager) and press Enter"
            className="flex-1 px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              addTag(
                newTitleInput,
                setNewTitleInput,
                targetTitles,
                setTargetTitles,
              )
            }
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetTitles.map((title) => (
            <span
              key={title}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent text-primary"
            >
              {title}
              <button
                type="button"
                onClick={() => removeTag(title, targetTitles, setTargetTitles)}
                className="ml-2 text-primary/70 hover:text-primary font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Resume */}
      <div>
        <label className="block text-[13px] font-semibold text-[#5C564C] mb-1.5">
          Resume / Core Background
        </label>
        <p className="text-xs text-muted-foreground mb-1.5">
          Your name, email, phone number, and website are automatically
          stripped out before this is sent to Claude for evaluation.
        </p>
        <textarea
          rows={6}
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your resume here"
          className="w-full px-3.5 py-3 border border-[#E2DACB] rounded-[10px] text-sm text-foreground font-sans focus:border-primary focus:ring-primary"
        />
      </div>

      {/* Technical & Operational Skills */}
      <div>
        <label className="block text-[13px] font-semibold text-[#5C564C] mb-1.5">
          Core Competencies & Skills
        </label>
        <div className="flex gap-2 mb-2.5">
          <input
            type="text"
            value={newSkillInput}
            onChange={(e) => setNewSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(
                  newSkillInput,
                  setNewSkillInput,
                  technicalSkills,
                  setTechnicalSkills,
                );
              }
            }}
            placeholder="Add skill (e.g. DevEx, HIPAA, Go, Linear) and press Enter"
            className="flex-1 px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              addTag(
                newSkillInput,
                setNewSkillInput,
                technicalSkills,
                setTechnicalSkills,
              )
            }
          >
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {technicalSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground"
            >
              {skill}
              <button
                type="button"
                onClick={() =>
                  removeTag(skill, technicalSkills, setTechnicalSkills)
                }
                className="ml-2 text-muted-foreground hover:text-foreground font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
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

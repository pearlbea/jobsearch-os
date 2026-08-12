"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

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
      "Platform TPM",
      "Engineering Manager",
      "Senior Full-Stack Engineer",
    ],
  );
  const [newTitleInput, setNewTitleInput] = useState("");

  const [locationPreference, setLocationPreference] = useState(
    initialProfile?.location_preference || "Remote (or Tulsa, OK)",
  );
  const [resumeText, setresumeText] = useState(initialProfile?.resume || "");

  const [technicalSkills, setTechnicalSkills] = useState<string[]>(
    initialProfile?.technical_skills || [
      "TypeScript",
      "Next.js",
      "Supabase",
      "Python",
      "Go",
      "HIPAA/WCAG",
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
    } catch (err: any) {
      console.error("Profile save error:", err);
      setMessage({
        type: "error",
        text: err.message || "Failed to save profile.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-3xl mx-auto p-6 space-y-8 bg-white border rounded-xl shadow-sm"
    >
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Candidate Profile</h2>
        <p className="text-sm text-gray-500">
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
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="e.g. Pearl Latteier"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Location Preference
          </label>
          <input
            type="text"
            value={locationPreference}
            onChange={(e) => setLocationPreference(e.target.value)}
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="e.g. Remote or Tulsa, OK"
          />
        </div>
      </div>

      {/* Target Titles (Array Input) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Target Roles / Titles
        </label>
        <div className="flex gap-2 mb-2">
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
            className="flex-1 px-3 py-2 border rounded-md shadow-sm text-sm"
          />
          <button
            type="button"
            onClick={() =>
              addTag(
                newTitleInput,
                setNewTitleInput,
                targetTitles,
                setTargetTitles,
              )
            }
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetTitles.map((title) => (
            <span
              key={title}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {title}
              <button
                type="button"
                onClick={() => removeTag(title, targetTitles, setTargetTitles)}
                className="ml-2 text-blue-600 hover:text-blue-900 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Executive Summary */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Executive Summary / Core Background
        </label>
        <textarea
          rows={6}
          value={resumeText}
          onChange={(e) => setresumeText(e.target.value)}
          placeholder="Paste or write your master executive summary highlighting your engineering, leadership, and domain expertise..."
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm font-sans"
        />
      </div>

      {/* Technical & Operational Skills */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Core Competencies & Skills
        </label>
        <div className="flex gap-2 mb-2">
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
            className="flex-1 px-3 py-2 border rounded-md shadow-sm text-sm"
          />
          <button
            type="button"
            onClick={() =>
              addTag(
                newSkillInput,
                setNewSkillInput,
                technicalSkills,
                setTechnicalSkills,
              )
            }
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
          >
            Add
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {technicalSkills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              {skill}
              <button
                type="button"
                onClick={() =>
                  removeTag(skill, technicalSkills, setTechnicalSkills)
                }
                className="ml-2 text-gray-500 hover:text-gray-800 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-4 border-t flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white font-medium text-sm rounded-md shadow hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving Profile..." : "Save Profile"}
        </button>
      </div>
    </form>
  );
}

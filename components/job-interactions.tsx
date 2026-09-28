"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Interaction,
  InteractionKind,
  InteractionOutcome,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  INTERACTION_KIND_LABELS,
  INTERACTION_OUTCOME_LABELS,
  labelOptions,
} from "@/lib/labels";

const KIND_OPTIONS = labelOptions(INTERACTION_KIND_LABELS);
const OUTCOME_OPTIONS = labelOptions(INTERACTION_OUTCOME_LABELS);

const NEW_FORM = "new";

const labelClass =
  "block text-[13px] font-semibold text-muted-foreground-strong mb-1.5";
const inputClass =
  "w-full px-3.5 py-2 border border-[#E2DACB] rounded-[10px] text-sm text-foreground focus:border-primary focus:ring-primary";

// Newest first, with unscheduled (null occurred_at) at the top, matches the
// page's server-side ordering so adds/edits land where a reload would put them.
function sortInteractions(list: Interaction[]): Interaction[] {
  return [...list].sort((a, b) => {
    if (a.occurred_at === b.occurred_at) return 0;
    if (a.occurred_at === null) return -1;
    if (b.occurred_at === null) return 1;
    return b.occurred_at.localeCompare(a.occurred_at);
  });
}

// <input type="datetime-local"> works in local time without an offset, while
// occurred_at is a UTC timestamptz.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

interface InteractionFormValues {
  kind: InteractionKind;
  occurred_at: string;
  interviewer_names: string;
  outcome: InteractionOutcome | "";
  notes: string;
}

function toFormValues(interaction?: Interaction): InteractionFormValues {
  return {
    kind: interaction?.kind ?? "recruiter_screen",
    occurred_at: toLocalInput(interaction?.occurred_at ?? null),
    interviewer_names: interaction?.interviewer_names?.join(", ") ?? "",
    outcome: interaction?.outcome ?? "",
    notes: interaction?.notes ?? "",
  };
}

function toPayload(values: InteractionFormValues): Partial<Interaction> {
  const names = values.interviewer_names
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  return {
    kind: values.kind,
    occurred_at: fromLocalInput(values.occurred_at),
    interviewer_names: names.length ? names : null,
    outcome: values.outcome || null,
    notes: values.notes.trim() || null,
  };
}

function InteractionForm({
  idPrefix,
  ariaLabel,
  initial,
  submitLabel,
  onSave,
  onCancel,
}: {
  idPrefix: string;
  ariaLabel: string;
  initial?: Interaction;
  submitLabel: string;
  onSave: (payload: Partial<Interaction>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(() => toFormValues(initial));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field = <K extends keyof InteractionFormValues>(key: K) => ({
    id: `${idPrefix}-${key}`,
    value: values[key],
    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setValues((prev) => ({
        ...prev,
        [key]: e.target.value as InteractionFormValues[K],
      })),
  });

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(toPayload(values));
    } catch (err: unknown) {
      console.error("Interaction save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label={ariaLabel}
      className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-border rounded-xl"
    >
      {error && (
        <div
          role="alert"
          className="sm:col-span-2 p-3 rounded-md text-sm font-medium bg-red-50 text-red-800"
        >
          {error}
        </div>
      )}
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-kind`}>
          Type
        </label>
        <select className={inputClass} {...field("kind")}>
          {KIND_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-occurred_at`}>
          Date &amp; Time
        </label>
        <input type="datetime-local" className={inputClass} {...field("occurred_at")} />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-interviewer_names`}>
          With
        </label>
        <input
          type="text"
          placeholder="Comma-separated names"
          className={inputClass}
          {...field("interviewer_names")}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-outcome`}>
          Outcome
        </label>
        <select className={inputClass} {...field("outcome")}>
          <option value="">Not set</option>
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`${idPrefix}-notes`}>
          Notes
        </label>
        <textarea
          rows={4}
          placeholder="Prep, questions asked, how it went"
          className="w-full px-3.5 py-3 border border-[#E2DACB] rounded-[10px] text-sm text-foreground font-sans focus:border-primary focus:ring-primary"
          {...field("notes")}
        />
      </div>
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function JobInteractions({
  jobId,
  userId,
  initialInteractions,
}: {
  jobId: string;
  userId: string;
  initialInteractions: Interaction[];
}) {
  const supabase = createClient();
  const [interactions, setInteractions] = useState(() =>
    sortInteractions(initialInteractions),
  );
  // Keys of the forms currently open: NEW_FORM for the add form, otherwise
  // the id of an interaction being edited. Several can be open at once so
  // opening one form never discards unsaved input in another.
  const [openForms, setOpenForms] = useState<ReadonlySet<string>>(new Set());
  const isOpen = (key: string) => openForms.has(key);
  const openForm = (key: string) =>
    setOpenForms((prev) => new Set(prev).add(key));
  const closeForm = (key: string) =>
    setOpenForms((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCreate = async (payload: Partial<Interaction>) => {
    const { data, error } = await supabase
      .from("interactions")
      .insert({ ...payload, kind: payload.kind!, job_id: jobId, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    setInteractions((prev) => sortInteractions([...prev, data]));
    closeForm(NEW_FORM);
  };

  const handleUpdate = async (id: string, payload: Partial<Interaction>) => {
    const { data, error } = await supabase
      .from("interactions")
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    if (!data) throw new Error("Interaction not found.");
    setInteractions((prev) =>
      sortInteractions(prev.map((i) => (i.id === id ? data : i))),
    );
    closeForm(id);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this interaction?")) return;
    setDeleteError(null);
    const { error } = await supabase
      .from("interactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) {
      console.error("Interaction delete error:", error);
      setDeleteError(error.message || "Failed to delete interaction.");
      return;
    }
    setInteractions((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <section
      aria-labelledby="interactions-heading"
      className="max-w-3xl mx-auto mt-8 p-8 space-y-6 bg-card border border-border rounded-2xl shadow-[0_6px_20px_rgba(60,45,20,0.05)]"
    >
      <div className="flex items-center justify-between gap-4">
        <h2
          id="interactions-heading"
          className="text-xl font-extrabold tracking-tight text-foreground"
        >
          Conversations &amp; Interviews
        </h2>
        {!isOpen(NEW_FORM) && (
          <Button type="button" onClick={() => openForm(NEW_FORM)}>
            Add Interaction
          </Button>
        )}
      </div>

      {deleteError && (
        <div
          role="alert"
          className="p-3 rounded-md text-sm font-medium bg-red-50 text-red-800"
        >
          {deleteError}
        </div>
      )}

      {isOpen(NEW_FORM) && (
        <InteractionForm
          idPrefix="new-interaction"
          ariaLabel="Add interaction"
          submitLabel="Add"
          onSave={handleCreate}
          onCancel={() => closeForm(NEW_FORM)}
        />
      )}

      {interactions.length === 0 && !isOpen(NEW_FORM) ? (
        <p className="text-sm text-muted-foreground">
          No conversations or interviews yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {interactions.map((interaction) =>
            isOpen(interaction.id) ? (
              <li key={interaction.id}>
                <InteractionForm
                  idPrefix={`interaction-${interaction.id}`}
                  ariaLabel={`Edit ${INTERACTION_KIND_LABELS[interaction.kind]}`}
                  initial={interaction}
                  submitLabel="Save"
                  onSave={(payload) => handleUpdate(interaction.id, payload)}
                  onCancel={() => closeForm(interaction.id)}
                />
              </li>
            ) : (
              <li
                key={interaction.id}
                className="p-4 border border-border rounded-xl space-y-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-bold text-foreground">
                    {INTERACTION_KIND_LABELS[interaction.kind]}
                    {interaction.outcome && (
                      <span className="ml-2 text-xs font-semibold text-muted-foreground">
                        {INTERACTION_OUTCOME_LABELS[interaction.outcome]}
                      </span>
                    )}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    {interaction.occurred_at
                      ? new Date(interaction.occurred_at).toLocaleString()
                      : "Not scheduled"}
                  </span>
                </div>
                {interaction.interviewer_names?.length ? (
                  <p className="text-sm text-foreground">
                    With {interaction.interviewer_names.join(", ")}
                  </p>
                ) : null}
                {interaction.notes && (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {interaction.notes}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openForm(interaction.id)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(interaction.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

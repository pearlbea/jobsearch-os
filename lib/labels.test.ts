import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  INTERACTION_KIND_LABELS,
  INTERACTION_OUTCOME_LABELS,
  STATUS_LABELS,
  WORK_MODE_LABELS,
  labelOptions,
} from "./labels";

// The latest `check (<column> in (...))` for a column across the migrations,
// applied in filename order — i.e. the values the database currently allows.
function allowedValues(column: string): string[] {
  const dir = join(process.cwd(), "supabase/migrations");
  const sql = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(dir, f), "utf8"))
    .join("\n");
  const matches = [
    ...sql.matchAll(new RegExp(`check \\(${column} in \\(([^)]*)\\)`, "g")),
  ];
  if (matches.length === 0) throw new Error(`No check constraint for ${column}`);
  return [...matches.at(-1)![1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe("labels", () => {
  it.each([
    ["status", STATUS_LABELS],
    ["work_mode", WORK_MODE_LABELS],
    ["kind", INTERACTION_KIND_LABELS],
    ["outcome", INTERACTION_OUTCOME_LABELS],
  ])("has a label for exactly the %s values the database allows", (column, labels) => {
    expect(Object.keys(labels).sort()).toEqual(allowedValues(column).sort());
  });

  it("builds options in the label map's order", () => {
    expect(labelOptions(WORK_MODE_LABELS)).toEqual([
      { value: "remote", label: "Remote" },
      { value: "hybrid", label: "Hybrid" },
      { value: "onsite", label: "Onsite" },
    ]);
  });
});

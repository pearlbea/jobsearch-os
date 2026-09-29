import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  makeEvaluation,
  makeInteraction,
  makeJob,
  makeProfile,
  makeStory,
} from "@/test/fixtures";
import { MAX_EVALUATIONS_PER_USER } from "@/lib/evaluation-engine";

// supabase/schema.sql is what someone runs to create their own copy of the
// database, so it has to keep up with types/database.ts. The fixtures return
// complete rows of each type, so their keys are the columns the app expects.

const sql = readFileSync(join(process.cwd(), "supabase/schema.sql"), "utf8")
  // Drop comments so commented-out SQL can't count.
  .replace(/--.*$/gm, "");

function schemaColumns(table: string): string[] {
  const columns = new Set<string>();
  const create = sql.match(
    new RegExp(`create table if not exists public\\.${table} \\(([\\s\\S]*?)\\n\\);`),
  );
  if (!create) throw new Error(`No create table for ${table} in schema.sql`);
  // Column definitions are the lines indented exactly two spaces; wrapped
  // continuations (e.g. a long check) are indented further.
  for (const [, column] of create[1].matchAll(/^ {2}(\w+) /gm)) {
    columns.add(column);
  }
  // Columns added later by the alter-table section at the bottom.
  for (const statement of sql.split(";")) {
    if (!new RegExp(`alter table public\\.${table}\\b`).test(statement)) continue;
    for (const [, column] of statement.matchAll(/add column if not exists (\w+)/g)) {
      columns.add(column);
    }
  }
  return [...columns].sort();
}

describe("supabase/schema.sql", () => {
  it.each([
    ["profiles", makeProfile()],
    ["stories", makeStory()],
    ["jobs", makeJob()],
    ["evaluations", makeEvaluation()],
    ["interactions", makeInteraction()],
  ])("defines exactly the %s columns in types/database.ts", (table, row) => {
    expect(schemaColumns(table)).toEqual(Object.keys(row).sort());
  });

  it("enforces the same evaluation limit as the app", () => {
    const fn = sql.match(
      /function public\.enforce_evaluation_limit\(\)[\s\S]*?\$\$;/,
    );
    expect(fn).not.toBeNull();
    expect(fn![0]).toContain(`>= ${MAX_EVALUATIONS_PER_USER} then`);
    expect(fn![0]).toContain(`at most ${MAX_EVALUATIONS_PER_USER} evaluations`);
    expect(sql).toMatch(
      /create trigger evaluations_enforce_limit\s+before insert on public\.evaluations/,
    );
  });

  it("enables row level security on every table", () => {
    for (const table of ["profiles", "stories", "jobs", "evaluations", "interactions"]) {
      expect(sql).toContain(`alter table public.${table} enable row level security;`);
    }
  });
});

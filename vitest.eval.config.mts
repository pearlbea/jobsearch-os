import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";
import nextEnv from "@next/env";

const { combinedEnv } = nextEnv.loadEnvConfig(process.cwd());

// Next skips .env.local when NODE_ENV=test (which vitest sets).
const localEnvPath = path.join(process.cwd(), ".env.local");
const localEnv = existsSync(localEnvPath)
  ? parseEnv(readFileSync(localEnvPath, "utf8"))
  : {};

// Separate from vitest.config.mts: these call the real Claude API (cost + usage) and require ANTHROPIC_API_KEY, so they only run via `npm run eval`, never `npm test`.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["evals/**/*.eval.ts"],
    env: { ...localEnv, ...combinedEnv },
    // beforeAll fires every case's EVAL_RUNS model calls.
    hookTimeout: 300_000,
  },
});

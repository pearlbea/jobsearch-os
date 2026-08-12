import { defineConfig } from "vitest/config";
import nextEnv from "@next/env";

const { combinedEnv } = nextEnv.loadEnvConfig(process.cwd());

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    env: combinedEnv,
  },
});

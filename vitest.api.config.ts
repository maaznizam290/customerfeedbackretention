import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/api/**/*.test.ts"],
    globalSetup: ["tests/globalSetupApi.ts"],
    testTimeout: 20000,
    hookTimeout: 70000,
    fileParallelism: false,
  },
});

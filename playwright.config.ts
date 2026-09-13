import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";

const PORT = 3102;
const runDir = path.join(os.tmpdir(), `atharx-e2e-${Date.now()}`);

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
  webServer: {
    // Production build+start rather than `next dev`: avoids on-demand
    // route compilation / Fast Refresh timing flakiness during navigation.
    command: `node_modules/.bin/tsx scripts/seed.ts && node_modules/.bin/next build && node_modules/.bin/next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_FILE: path.join(runDir, "e2e.db"),
      ATHARX_TEST_DIST_DIR: path.join(runDir, ".next-e2e"),
      OMANTEL_API_MODE: "mock",
    },
  },
});

import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Spins up a real `next dev` server on a dedicated port against a throwaway
// SQLite database, so tests/api/*.test.ts can exercise the actual HTTP
// routes (auth, catalog, subscription, reward, spin APIs) end-to-end rather
// than only at the service layer. Torn down after the run.

const PORT = 3101;
export const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

const NEXT_BIN = path.join(process.cwd(), "node_modules", ".bin", "next");
const TSX_BIN = path.join(process.cwd(), "node_modules", ".bin", "tsx");

let serverProcess: ChildProcess | undefined;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`ATHARX test server did not become ready at ${url} within ${timeoutMs}ms`);
}

function runSeed(dbFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const seedProcess = spawn(TSX_BIN, ["scripts/seed.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_FILE: dbFile },
      stdio: "ignore",
    });
    seedProcess.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exited with ${code}`))));
    seedProcess.on("error", reject);
  });
}

export default async function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atharx-api-test-"));
  const dbFile = path.join(dir, "api-test.db");

  process.env.ATHARX_TEST_BASE_URL = BASE_URL;

  // Populate the catalog/campaigns/milestones/spin/lucky-draw fixtures the
  // same way a real deployment would, before the server starts serving them.
  await runSeed(dbFile);

  // Spawned directly (not via `npx`, which wraps the real process in an
  // extra shell/npx layer that survives a SIGTERM to the wrapper) and
  // detached into its own process group, so teardown can reliably kill the
  // whole tree instead of leaking an orphaned `next dev` holding the port.
  serverProcess = spawn(NEXT_BIN, ["dev", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_FILE: dbFile,
      OMANTEL_API_MODE: "mock",
      ATHARX_TEST_DIST_DIR: path.join(dir, ".next-test"),
    },
    stdio: "ignore",
    detached: true,
  });

  await waitForServer(`${BASE_URL}/health`, 60_000);

  return async () => {
    if (serverProcess && !serverProcess.killed && serverProcess.pid) {
      try {
        process.kill(-serverProcess.pid, "SIGTERM");
      } catch {
        serverProcess.kill("SIGTERM");
      }
    }
  };
}

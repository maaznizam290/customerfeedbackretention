import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll } from "vitest";

// Gives every test FILE its own throwaway SQLite database. db.ts caches its
// connection on globalThis (so it survives Next.js hot reloads in dev), which
// also means that cache persists across vitest test files running in the
// same worker process — so we explicitly clear it here alongside pointing
// DATABASE_FILE at a fresh temp path, before any test in the file touches
// the db.
beforeAll(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atharx-test-"));
  process.env.DATABASE_FILE = path.join(dir, "test.db");
  (globalThis as unknown as { __atharxDb?: unknown }).__atharxDb = undefined;
});

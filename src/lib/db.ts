import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Single synchronous SQLite connection for the whole process.
// better-sqlite3 executes queries synchronously, so wrapping a read-check +
// write in db.transaction(...) gives us real atomicity against concurrent
// requests within this Node process (no interleaving is possible mid-transaction).
// This is what protects idempotency keys, unique MSISDN, unique signup reward,
// and the 24-hour spin cooldown from double-processing.

declare global {
  var __atharxDb: Database.Database | undefined;
}

function resolveDbFile(): string {
  const configured = process.env.DATABASE_FILE || "./db/atharx.db";
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

function createConnection(): Database.Database {
  const dbFile = resolveDbFile();
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  return db;
}

export function getDb(): Database.Database {
  if (!global.__atharxDb) {
    global.__atharxDb = createConnection();
  }
  return global.__atharxDb;
}

export function nextSequence(name: string): number {
  const db = getDb();
  const run = db.transaction((counterName: string) => {
    db.prepare(
      "INSERT INTO id_counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1"
    ).run(counterName);
    const row = db.prepare("SELECT value FROM id_counters WHERE name = ?").get(counterName) as
      | { value: number }
      | undefined;
    return row?.value ?? 1;
  });
  return run(name);
}

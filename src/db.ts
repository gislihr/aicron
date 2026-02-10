import { Database } from "bun:sqlite";
import { DB_PATH, ensureDir } from "./utils.ts";

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  ensureDir();
  _db = new Database(DB_PATH);
  _db.run("PRAGMA journal_mode = WAL");
  _db.run("PRAGMA foreign_keys = ON");
  migrate(_db);
  return _db;
}

function migrate(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt     TEXT NOT NULL,
      schedule   TEXT NOT NULL,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      started_at  TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      stdout      TEXT,
      stderr      TEXT,
      exit_code   INTEGER
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  // Create indexes if they don't exist
  db.run("CREATE INDEX IF NOT EXISTS idx_runs_job_id ON runs(job_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at)");
}

// Job types
export interface Job {
  id: number;
  prompt: string;
  schedule: string;
  active: number;
  created_at: string;
}

export interface Run {
  id: number;
  job_id: number;
  started_at: string;
  finished_at: string | null;
  stdout: string | null;
  stderr: string | null;
  exit_code: number | null;
}

// Job queries
export function createJob(prompt: string, schedule: string): number {
  const db = getDb();
  const result = db.run("INSERT INTO jobs (prompt, schedule) VALUES (?, ?)", [prompt, schedule]);
  return Number(result.lastInsertRowid);
}

export function getJob(id: number): Job | null {
  const db = getDb();
  return db.query("SELECT * FROM jobs WHERE id = ?").get(id) as Job | null;
}

export function listJobs(): Job[] {
  const db = getDb();
  return db.query("SELECT * FROM jobs ORDER BY id").all() as Job[];
}

export function deleteJob(id: number): void {
  const db = getDb();
  db.run("DELETE FROM jobs WHERE id = ?", [id]);
}

export function setJobActive(id: number, active: boolean): void {
  const db = getDb();
  db.run("UPDATE jobs SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
}

// Run queries
export function createRun(jobId: number): number {
  const db = getDb();
  const result = db.run("INSERT INTO runs (job_id) VALUES (?)", [jobId]);
  return Number(result.lastInsertRowid);
}

export function finishRun(
  runId: number,
  stdout: string | null,
  stderr: string | null,
  exitCode: number | null
): void {
  const db = getDb();
  db.run(
    "UPDATE runs SET finished_at = datetime('now'), stdout = ?, stderr = ?, exit_code = ? WHERE id = ?",
    [stdout, stderr, exitCode, runId]
  );
}

export function getRunsForJob(jobId: number, limit = 10): Run[] {
  const db = getDb();
  return db
    .query("SELECT * FROM runs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?")
    .all(jobId, limit) as Run[];
}

export function getRecentRuns(limit = 10): (Run & { prompt: string })[] {
  const db = getDb();
  return db
    .query(
      `SELECT r.*, j.prompt FROM runs r
       JOIN jobs j ON j.id = r.job_id
       ORDER BY r.started_at DESC LIMIT ?`
    )
    .all(limit) as (Run & { prompt: string })[];
}

export function getLastRun(jobId: number): Run | null {
  const db = getDb();
  return db
    .query("SELECT * FROM runs WHERE job_id = ? ORDER BY started_at DESC LIMIT 1")
    .get(jobId) as Run | null;
}

// Config queries
export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.query("SELECT value FROM config WHERE key = ?").get(key) as { value: string } | null;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string): void {
  const db = getDb();
  db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [key, value]);
}

export function getAllConfig(): Record<string, string> {
  const db = getDb();
  const rows = db.query("SELECT key, value FROM config").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function deleteConfig(key: string): void {
  const db = getDb();
  db.run("DELETE FROM config WHERE key = ?", [key]);
}

import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";

// Paths
export const AICRON_DIR = join(homedir(), ".aicron");
export const DB_PATH = join(AICRON_DIR, "aicron.db");

export function ensureDir(): void {
  if (!existsSync(AICRON_DIR)) {
    mkdirSync(AICRON_DIR, { recursive: true });
  }
}

// Resolve absolute path to a binary
export function whichSync(bin: string): string {
  const result = Bun.spawnSync(["which", bin]);
  const path = result.stdout.toString().trim();
  if (result.exitCode !== 0 || !path) {
    throw new Error(`Could not find '${bin}' in PATH`);
  }
  return path;
}

// Date formatting
export function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso + "Z"); // SQLite datetimes are UTC
  return d.toLocaleString();
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso + "Z");
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Cron schedule descriptions
const SCHEDULE_MAP: Record<string, string> = {
  "0 * * * *": "Every hour",
  "0 9 * * *": "Every day at 9:00 AM",
  "0 0 * * *": "Every day at midnight",
  "0 9 * * 1": "Every Monday at 9:00 AM",
  "0 9 * * 1-5": "Every weekday at 9:00 AM",
  "*/15 * * * *": "Every 15 minutes",
};

export function describeCron(expr: string): string {
  return SCHEDULE_MAP[expr] || expr;
}

// ANSI colors (with TTY detection)
const isTTY = process.stdout.isTTY ?? false;

function color(code: string, text: string): string {
  return isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
}

export const c = {
  bold: (t: string) => color("1", t),
  dim: (t: string) => color("2", t),
  green: (t: string) => color("32", t),
  red: (t: string) => color("31", t),
  yellow: (t: string) => color("33", t),
  cyan: (t: string) => color("36", t),
  gray: (t: string) => color("90", t),
};

// Pad string to width
export function pad(str: string, width: number): string {
  const len = str.replace(/\x1b\[[0-9;]*m/g, "").length; // strip ANSI for length calc
  return str + " ".repeat(Math.max(0, width - len));
}

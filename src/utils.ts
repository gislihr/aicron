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
  "* * * * *": "Every minute",
  "*/5 * * * *": "Every 5 minutes",
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *": "Every hour",
  "0 */6 * * *": "Every 6 hours",
  "0 9 * * *": "Every day at 9:00 AM",
  "0 0 * * *": "Every day at midnight",
  "0 9 * * 1-5": "Every weekday at 9:00 AM",
  "0 9 * * 1": "Every Monday at 9:00 AM",
  "0 0 * * 0": "Every Sunday at midnight",
  "0 9 1 * *": "1st of every month at 9:00 AM",
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

// Interactive arrow-key picker
// Returns the index of the selected item, or -1 if cancelled.
// `renderItem(index, active)` should return the display string for that row.
export function pickList(
  items: number,
  renderItem: (index: number, active: boolean) => string,
  opts?: { startIndex?: number }
): Promise<number> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(-1);
      return;
    }

    let selected = opts?.startIndex ?? 0;

    const write = (s: string) => process.stdout.write(s);
    const hideCursor = () => write("\x1b[?25l");
    const showCursor = () => write("\x1b[?25h");
    const clearLines = (n: number) => {
      for (let i = 0; i < n; i++) {
        write("\x1b[2K");
        if (i < n - 1) write("\x1b[A");
      }
      write("\r");
    };

    const render = () => {
      const lines: string[] = [];
      for (let i = 0; i < items; i++) {
        lines.push(renderItem(i, i === selected));
      }
      return lines.join("\n");
    };

    hideCursor();
    const rendered = render();
    write(rendered);
    const lineCount = rendered.split("\n").length;

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (buf: Buffer) => {
      const key = buf.toString();

      if (key === "\x1b[A" || key === "k") {
        if (selected > 0) selected--;
      } else if (key === "\x1b[B" || key === "j") {
        if (selected < items - 1) selected++;
      } else if (key === "\r" || key === "\n") {
        cleanup();
        clearLines(lineCount);
        showCursor();
        resolve(selected);
        return;
      } else if (key === "\x03") {
        cleanup();
        showCursor();
        write("\n");
        process.exit(130);
      } else if (key === "q" || key === "\x1b") {
        cleanup();
        clearLines(lineCount);
        showCursor();
        resolve(-1);
        return;
      }

      clearLines(lineCount);
      write(render());
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", onData);
      process.stdin.pause();
    };

    process.stdin.on("data", onData);
  });
}

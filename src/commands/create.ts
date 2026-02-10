import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createJob } from "../db.ts";
import { installCronEntry } from "../crontab.ts";
import { whichSync, describeCron, c } from "../utils.ts";

interface Option {
  label: string;
  cron: string;
  group: string;
}

const SCHEDULES: Option[] = [
  { label: "Every minute", cron: "* * * * *", group: "frequent" },
  { label: "Every 5 minutes", cron: "*/5 * * * *", group: "frequent" },
  { label: "Every 15 minutes", cron: "*/15 * * * *", group: "frequent" },
  { label: "Every 30 minutes", cron: "*/30 * * * *", group: "frequent" },
  { label: "Every hour", cron: "0 * * * *", group: "frequent" },
  { label: "Every 6 hours", cron: "0 */6 * * *", group: "daily" },
  { label: "Every day at 9:00 AM", cron: "0 9 * * *", group: "daily" },
  { label: "Every day at midnight", cron: "0 0 * * *", group: "daily" },
  { label: "Every weekday at 9:00 AM", cron: "0 9 * * 1-5", group: "weekly" },
  { label: "Every Monday at 9:00 AM", cron: "0 9 * * 1", group: "weekly" },
  { label: "Every Sunday at midnight", cron: "0 0 * * 0", group: "weekly" },
  { label: "1st of every month at 9:00 AM", cron: "0 9 1 * *", group: "monthly" },
];

const CUSTOM_LABEL = "Custom cron expression";
const TOTAL_OPTIONS = SCHEDULES.length + 1; // +1 for custom

function buildLines(): string[] {
  const lines: string[] = [];
  let lastGroup = "";
  for (let i = 0; i < SCHEDULES.length; i++) {
    const s = SCHEDULES[i];
    if (s.group !== lastGroup) {
      if (lastGroup) lines.push(""); // blank separator
      lastGroup = s.group;
    }
    lines.push(`schedule:${i}`);
  }
  lines.push(""); // blank before custom
  lines.push("custom");
  return lines;
}

function renderMenu(lines: string[], selected: number): string {
  let selIdx = 0; // tracks which selectable option we're on
  const out: string[] = [];
  for (const line of lines) {
    if (line === "") {
      out.push("");
    } else if (line === "custom") {
      const active = selIdx === selected;
      const prefix = active ? c.green("❯") : " ";
      const text = active ? c.bold(CUSTOM_LABEL) : c.dim(CUSTOM_LABEL);
      out.push(`  ${prefix} ${text}`);
      selIdx++;
    } else {
      const i = parseInt(line.split(":")[1], 10);
      const s = SCHEDULES[i];
      const active = selIdx === selected;
      const prefix = active ? c.green("❯") : " ";
      const label = active ? c.bold(s.label) : s.label;
      const cron = c.gray(`(${s.cron})`);
      out.push(`  ${prefix} ${label} ${cron}`);
      selIdx++;
    }
  }
  return out.join("\n");
}

function interactivePicker(): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("Interactive picker requires a TTY"));
      return;
    }

    let selected = 0;
    const lines = buildLines();

    const write = (s: string) => process.stdout.write(s);
    const hideCursor = () => write("\x1b[?25l");
    const showCursor = () => write("\x1b[?25h");
    const clearLines = (n: number) => {
      for (let i = 0; i < n; i++) {
        write("\x1b[2K"); // clear line
        if (i < n - 1) write("\x1b[A"); // move up
      }
      write("\r");
    };

    hideCursor();

    const rendered = renderMenu(lines, selected);
    write(rendered);
    const lineCount = rendered.split("\n").length;

    process.stdin.setRawMode(true);
    process.stdin.resume();

    const onData = (buf: Buffer) => {
      const key = buf.toString();

      if (key === "\x1b[A") {
        // Up arrow
        if (selected > 0) selected--;
      } else if (key === "\x1b[B") {
        // Down arrow
        if (selected < TOTAL_OPTIONS - 1) selected++;
      } else if (key === "\r" || key === "\n") {
        // Enter
        cleanup();
        clearLines(lineCount);
        showCursor();
        resolve(selected);
        return;
      } else if (key === "\x03") {
        // Ctrl+C
        cleanup();
        showCursor();
        write("\n");
        process.exit(130);
      } else if (key === "q" || key === "\x1b") {
        // q or Escape
        cleanup();
        showCursor();
        write("\n");
        process.exit(0);
      }

      // Re-render
      clearLines(lineCount);
      write(renderMenu(lines, selected));
    };

    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.removeListener("data", onData);
      process.stdin.pause();
    };

    process.stdin.on("data", onData);
  });
}

export async function createCommand(prompt: string): Promise<void> {
  let schedule: string;

  console.log(`\n${c.bold("How often should this run?")}\n`);

  if (process.stdin.isTTY) {
    const selected = await interactivePicker();

    if (selected < SCHEDULES.length) {
      const s = SCHEDULES[selected];
      console.log(`  ${c.green("❯")} ${c.bold(s.label)} ${c.gray(`(${s.cron})`)}`);
      schedule = s.cron;
    } else {
      // Custom
      console.log(`  ${c.green("❯")} ${c.bold(CUSTOM_LABEL)}\n`);
      schedule = await promptCustomCron();
    }
  } else {
    // Non-TTY fallback: number input
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      for (let i = 0; i < SCHEDULES.length; i++) {
        console.log(`  ${i + 1}) ${SCHEDULES[i].label} (${SCHEDULES[i].cron})`);
      }
      console.log(`  ${SCHEDULES.length + 1}) ${CUSTOM_LABEL}`);
      const answer = await rl.question(`Choose [1-${TOTAL_OPTIONS}]: `);
      const choice = parseInt(answer.trim(), 10);
      if (choice >= 1 && choice <= SCHEDULES.length) {
        schedule = SCHEDULES[choice - 1].cron;
      } else if (choice === TOTAL_OPTIONS) {
        schedule = await promptCustomCronRL(rl);
      } else {
        console.error(c.red("Invalid choice."));
        process.exit(1);
      }
    } finally {
      rl.close();
    }
  }

  const jobId = createJob(prompt, schedule);

  const bunPath = whichSync("bun");
  const entryPath = resolve(import.meta.dir, "../index.ts");
  const home = homedir();
  await installCronEntry(jobId, schedule, bunPath, entryPath, home);

  console.log(`\n${c.green("Created job")} ${c.bold(`#${jobId}`)}`);
  console.log(`  ${c.dim("Prompt:")}    ${prompt}`);
  console.log(`  ${c.dim("Schedule:")}  ${describeCron(schedule)} ${c.gray(`(${schedule})`)}`);
  console.log(`  ${c.dim("Status:")}    Active`);
}

function showCronHelp(): void {
  console.log(c.gray("  ┌──────── minute (0-59)"));
  console.log(c.gray("  │ ┌────── hour (0-23)"));
  console.log(c.gray("  │ │ ┌──── day of month (1-31)"));
  console.log(c.gray("  │ │ │ ┌── month (1-12)"));
  console.log(c.gray("  │ │ │ │ ┌ day of week (0-6, Sun=0)"));
  console.log(c.gray("  │ │ │ │ │"));
  console.log(c.gray("  * * * * *"));
  console.log("");
  console.log(c.gray("  Examples:  0 9 * * *     Every day at 9 AM"));
  console.log(c.gray("             */10 * * * *  Every 10 minutes"));
  console.log(c.gray("             0 9 * * 1-5   Weekdays at 9 AM"));
  console.log(c.gray("             0 0 1 * *     1st of month at midnight"));
  console.log("");
}

async function promptCustomCron(): Promise<string> {
  showCronHelp();
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await promptCustomCronRL(rl);
  } finally {
    rl.close();
  }
}

async function promptCustomCronRL(rl: ReturnType<typeof createInterface>): Promise<string> {
  const custom = await rl.question("  Enter cron expression: ");
  const schedule = custom.trim();
  if (!schedule || schedule.split(/\s+/).length < 5) {
    console.error(c.red("Invalid cron expression. Need 5 fields."));
    process.exit(1);
  }
  return schedule;
}

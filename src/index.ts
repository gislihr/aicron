#!/usr/bin/env bun

import { createCommand } from "./commands/create.ts";
import { listCommand } from "./commands/list.ts";
import { recentCommand } from "./commands/recent.ts";
import { runCommand } from "./commands/run.ts";
import { showCommand } from "./commands/show.ts";
import { removeCommand } from "./commands/remove.ts";
import { pauseCommand, resumeCommand } from "./commands/pause.ts";
import { c } from "./utils.ts";

const args = process.argv.slice(2);
const command = args[0];

function usage(): void {
  console.log(`
${c.bold("aicron")} — Schedule Claude prompts via cron

${c.bold("Usage:")}
  aicron ${c.cyan("'prompt text'")}    Create a new scheduled job
  aicron                    List all jobs
  aicron ${c.cyan("runs")}             Show last 10 run results
  aicron ${c.cyan("show <id>")}        Show job details + recent runs
  aicron ${c.cyan("remove <id>")}      Delete a job and its cron entry
  aicron ${c.cyan("pause <id>")}       Disable a job
  aicron ${c.cyan("resume <id>")}      Re-enable a paused job
`);
}

async function main(): Promise<void> {
  // No args → list jobs
  if (!command) {
    await listCommand();
    return;
  }

  switch (command) {
    case "list":
      await listCommand();
      break;
    case "runs":
      await recentCommand();
      break;
    case "show":
      showCommand(args.slice(1));
      break;
    case "run":
      await runCommand(args.slice(1));
      break;
    case "remove":
      await removeCommand(args.slice(1));
      break;
    case "pause":
      await pauseCommand(args.slice(1));
      break;
    case "resume":
      await resumeCommand(args.slice(1));
      break;
    case "help":
    case "--help":
    case "-h":
      usage();
      break;
    default:
      // Treat as a prompt to create a new job
      await createCommand(command);
      break;
  }
}

main().catch((err) => {
  console.error(c.red(err.message ?? String(err)));
  process.exit(1);
});

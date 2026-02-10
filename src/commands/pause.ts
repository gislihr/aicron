import { resolve } from "node:path";
import { homedir } from "node:os";
import { getJob, setJobActive } from "../db.ts";
import { removeCronEntry, installCronEntry } from "../crontab.ts";
import { whichSync, c } from "../utils.ts";

export async function pauseCommand(args: string[]): Promise<void> {
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error("Usage: aicron pause <id>");
    process.exit(1);
  }

  const job = getJob(id);
  if (!job) {
    console.error(c.red(`Job #${id} not found`));
    process.exit(1);
  }
  if (!job.active) {
    console.log(c.yellow(`Job #${id} is already paused`));
    return;
  }

  await removeCronEntry(id);
  setJobActive(id, false);

  console.log(`${c.yellow("Paused")} job ${c.bold(`#${id}`)}`);
}

export async function resumeCommand(args: string[]): Promise<void> {
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error("Usage: aicron resume <id>");
    process.exit(1);
  }

  const job = getJob(id);
  if (!job) {
    console.error(c.red(`Job #${id} not found`));
    process.exit(1);
  }
  if (job.active) {
    console.log(c.yellow(`Job #${id} is already active`));
    return;
  }

  const bunPath = whichSync("bun");
  const entryPath = resolve(import.meta.dir, "../index.ts");
  const home = homedir();
  await installCronEntry(id, job.schedule, bunPath, entryPath, home);
  setJobActive(id, true);

  console.log(`${c.green("Resumed")} job ${c.bold(`#${id}`)}`);
}

import { getJob, deleteJob } from "../db.ts";
import { removeCronEntry } from "../crontab.ts";
import { c } from "../utils.ts";

export async function removeCommand(args: string[]): Promise<void> {
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error("Usage: aicron remove <id>");
    process.exit(1);
  }

  const job = getJob(id);
  if (!job) {
    console.error(c.red(`Job #${id} not found`));
    process.exit(1);
  }

  await removeCronEntry(id);
  deleteJob(id); // CASCADE deletes runs too

  console.log(`${c.green("Removed")} job ${c.bold(`#${id}`)} and its run history`);
}

import { listJobs, getLastRun } from "../db.ts";
import { describeCron, timeAgo, c, pad, pickList } from "../utils.ts";
import { showCommand } from "./show.ts";

export async function listCommand(): Promise<void> {
  const jobs = listJobs();

  if (jobs.length === 0) {
    console.log(c.dim("No jobs yet. Create one with: aicron 'your prompt'"));
    return;
  }

  const header = c.dim(
    `${pad("ID", 6)}${pad("STATUS", 10)}${pad("SCHEDULE", 28)}${pad("LAST RUN", 14)}PROMPT`
  );

  if (!process.stdin.isTTY) {
    console.log(header);
    console.log(c.dim("-".repeat(80)));
    for (const job of jobs) {
      console.log(formatRow(job, false));
    }
    return;
  }

  console.log(header);

  const selected = await pickList(jobs.length, (i, active) => {
    return formatRow(jobs[i], active);
  });

  if (selected === -1) return;

  const job = jobs[selected];
  console.log(formatRow(job, true));
  console.log("");
  showCommand([String(job.id)]);
}

function formatRow(
  job: { id: number; active: number; schedule: string; prompt: string },
  active: boolean
): string {
  const status = job.active ? c.green("active") : c.yellow("paused");
  const schedDesc = describeCron(job.schedule);
  const lastRun = getLastRun(job.id);
  const lastRunStr = lastRun ? timeAgo(lastRun.started_at) : c.dim("never");
  const promptPreview = job.prompt.length > 40 ? job.prompt.slice(0, 37) + "..." : job.prompt;
  const prefix = active ? c.green("❯") : " ";

  return `${prefix} ${pad(c.bold(`#${job.id}`), 6)}${pad(status, 10)}${pad(schedDesc, 28)}${pad(lastRunStr, 14)}${promptPreview}`;
}

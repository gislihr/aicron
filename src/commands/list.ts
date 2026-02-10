import { listJobs, getLastRun } from "../db.ts";
import { describeCron, timeAgo, c, pad } from "../utils.ts";

export function listCommand(): void {
  const jobs = listJobs();

  if (jobs.length === 0) {
    console.log(c.dim("No jobs yet. Create one with: aicron 'your prompt'"));
    return;
  }

  // Header
  console.log(
    c.bold(
      `${pad("ID", 6)}${pad("STATUS", 10)}${pad("SCHEDULE", 28)}${pad("LAST RUN", 14)}PROMPT`
    )
  );
  console.log(c.dim("-".repeat(80)));

  for (const job of jobs) {
    const status = job.active ? c.green("active") : c.yellow("paused");
    const schedDesc = describeCron(job.schedule);
    const lastRun = getLastRun(job.id);
    const lastRunStr = lastRun ? timeAgo(lastRun.started_at) : c.dim("never");
    const promptPreview = job.prompt.length > 40 ? job.prompt.slice(0, 37) + "..." : job.prompt;

    console.log(
      `${pad(c.bold(`#${job.id}`), 6)}${pad(status, 10)}${pad(schedDesc, 28)}${pad(lastRunStr, 14)}${promptPreview}`
    );
  }
}

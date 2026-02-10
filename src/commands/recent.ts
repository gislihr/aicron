import { getRecentRuns } from "../db.ts";
import { timeAgo, c, pad } from "../utils.ts";

export function recentCommand(): void {
  const runs = getRecentRuns(10);

  if (runs.length === 0) {
    console.log(c.dim("No runs yet. Create a job with: aicron 'your prompt'"));
    return;
  }

  console.log(c.bold(`${pad("JOB", 6)}${pad("EXIT", 7)}${pad("WHEN", 14)}PROMPT`));
  console.log(c.dim("-".repeat(70)));

  for (const run of runs) {
    const exitStr =
      run.exit_code === null
        ? c.yellow("...")
        : run.exit_code === 0
          ? c.green("0")
          : c.red(String(run.exit_code));
    const when = timeAgo(run.started_at);
    const promptPreview = run.prompt.length > 40 ? run.prompt.slice(0, 37) + "..." : run.prompt;

    console.log(`${pad(c.bold(`#${run.job_id}`), 6)}${pad(exitStr, 7)}${pad(when, 14)}${promptPreview}`);
  }
}

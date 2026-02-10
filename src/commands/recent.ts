import { getRecentRuns } from "../db.ts";
import { timeAgo, c, pad, pickList } from "../utils.ts";
import { showCommand } from "./show.ts";

export async function recentCommand(): Promise<void> {
  const runs = getRecentRuns(10);

  if (runs.length === 0) {
    console.log(c.dim("No runs yet. Create a job with: aicron 'your prompt'"));
    return;
  }

  const header = c.dim(`${pad("JOB", 6)}${pad("EXIT", 7)}${pad("WHEN", 14)}PROMPT`);

  if (!process.stdin.isTTY) {
    console.log(header);
    console.log(c.dim("-".repeat(70)));
    for (const run of runs) {
      console.log(formatRow(run, false));
    }
    return;
  }

  console.log(header);

  const selected = await pickList(runs.length, (i, active) => {
    return formatRow(runs[i], active);
  });

  if (selected === -1) return;

  const run = runs[selected];
  console.log(formatRow(run, true));
  console.log("");
  showCommand([String(run.job_id)]);
}

function formatRow(
  run: { job_id: number; exit_code: number | null; started_at: string; prompt: string },
  active: boolean
): string {
  const exitStr =
    run.exit_code === null
      ? c.yellow("...")
      : run.exit_code === 0
        ? c.green("0")
        : c.red(String(run.exit_code));
  const when = timeAgo(run.started_at);
  const promptPreview = run.prompt.length > 50 ? run.prompt.slice(0, 47) + "..." : run.prompt;
  const prefix = active ? c.green("❯") : " ";

  return `${prefix} ${pad(c.bold(`#${run.job_id}`), 6)}${pad(exitStr, 7)}${pad(when, 14)}${promptPreview}`;
}

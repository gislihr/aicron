import { getJob, getRunsForJob } from "../db.ts";
import { describeCron, formatDate, c } from "../utils.ts";

export function showCommand(args: string[]): void {
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error("Usage: aicron show <id>");
    process.exit(1);
  }

  const job = getJob(id);
  if (!job) {
    console.error(c.red(`Job #${id} not found`));
    process.exit(1);
  }

  const status = job.active ? c.green("active") : c.yellow("paused");

  console.log(`\n${c.bold(`Job #${job.id}`)}`);
  console.log(`  ${c.dim("Prompt:")}    ${job.prompt}`);
  console.log(`  ${c.dim("Schedule:")}  ${describeCron(job.schedule)} ${c.gray(`(${job.schedule})`)}`);
  console.log(`  ${c.dim("Status:")}    ${status}`);
  console.log(`  ${c.dim("Created:")}   ${formatDate(job.created_at)}`);

  const runs = getRunsForJob(job.id, 10);
  if (runs.length === 0) {
    console.log(`\n${c.dim("No runs yet.")}`);
    return;
  }

  console.log(`\n${c.bold("Recent runs:")}`);
  for (const run of runs) {
    const exitStr =
      run.exit_code === null
        ? c.yellow("running")
        : run.exit_code === 0
          ? c.green("ok")
          : c.red(`exit ${run.exit_code}`);
    console.log(`\n  ${c.dim("Run #" + run.id)} ${c.dim("·")} ${formatDate(run.started_at)} ${c.dim("·")} ${exitStr}`);

    if (run.stdout) {
      const lines = run.stdout.trimEnd().split("\n");
      const preview = lines.slice(0, 20);
      for (const line of preview) {
        console.log(`    ${line}`);
      }
      if (lines.length > 20) {
        console.log(c.dim(`    ... ${lines.length - 20} more lines`));
      }
    }
    if (run.stderr && run.exit_code !== 0) {
      console.log(c.red(`    stderr: ${run.stderr.slice(0, 200)}`));
    }
  }
}

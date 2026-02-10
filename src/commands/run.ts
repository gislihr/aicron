import { getJob, createRun, finishRun, getConfig } from "../db.ts";
import { whichSync } from "../utils.ts";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export async function runCommand(args: string[]): Promise<void> {
  const id = parseInt(args[0], 10);
  if (isNaN(id)) {
    console.error("Usage: aicron run <id>");
    process.exit(1);
  }

  const job = getJob(id);
  if (!job) {
    console.error(`Job ${id} not found`);
    process.exit(1);
  }
  if (!job.active) {
    console.error(`Job ${id} is paused`);
    process.exit(1);
  }

  // Get the configured prompt command, default to "claude -p"
  const promptCmd = getConfig("prompt_command") ?? "claude -p";
  const cmdParts = promptCmd.split(" ");
  const binary = cmdParts[0];
  const cmdArgs = cmdParts.slice(1);
  
  const binaryPath = whichSync(binary);
  const runId = createRun(id);

  try {
    const proc = Bun.spawn([binaryPath, ...cmdArgs, job.prompt], {
      stdout: "pipe",
      stderr: "pipe",
      timeout: TIMEOUT_MS,
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    const exitCode = await proc.exited;

    finishRun(runId, stdout, stderr, exitCode);
  } catch (err: any) {
    finishRun(runId, null, err.message ?? String(err), 1);
  }
}

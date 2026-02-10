const MARKER_PREFIX = "# aicron:job:";

function marker(jobId: number): string {
  return `${MARKER_PREFIX}${jobId}`;
}

export async function readCrontab(): Promise<string> {
  const proc = Bun.spawn(["crontab", "-l"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const text = await new Response(proc.stdout).text();
  const code = await proc.exited;
  // crontab -l returns non-zero if no crontab exists
  if (code !== 0) return "";
  return text;
}

async function writeCrontab(content: string): Promise<void> {
  const proc = Bun.spawn(["crontab", "-"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(content);
  proc.stdin.end();
  const code = await proc.exited;
  if (code !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`Failed to write crontab: ${err}`);
  }
}

export async function installCronEntry(
  jobId: number,
  schedule: string,
  bunPath: string,
  entryPath: string,
  home: string
): Promise<void> {
  const existing = await readCrontab();
  const path = process.env.PATH ?? "";
  const line = `${schedule} PATH=${path} HOME=${home} ${bunPath} ${entryPath} run ${jobId} >> ~/.aicron/cron.log 2>&1`;
  const entry = `${marker(jobId)}\n${line}`;

  // Remove existing entry for this job if any
  const cleaned = removeLines(existing, jobId);
  const newContent = cleaned.trimEnd() + (cleaned.trim() ? "\n" : "") + entry + "\n";
  await writeCrontab(newContent);
}

export async function removeCronEntry(jobId: number): Promise<void> {
  const existing = await readCrontab();
  const cleaned = removeLines(existing, jobId);
  await writeCrontab(cleaned);
}

function removeLines(crontab: string, jobId: number): string {
  const lines = crontab.split("\n");
  const result: string[] = [];
  let skip = false;
  for (const line of lines) {
    if (line === marker(jobId)) {
      skip = true;
      continue;
    }
    if (skip) {
      skip = false;
      continue; // skip the command line after the marker
    }
    result.push(line);
  }
  return result.join("\n");
}

export async function listCronEntries(): Promise<Map<number, string>> {
  const content = await readCrontab();
  const lines = content.split("\n");
  const entries = new Map<number, string>();
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(MARKER_PREFIX)) {
      const id = parseInt(lines[i].slice(MARKER_PREFIX.length), 10);
      if (!isNaN(id) && i + 1 < lines.length) {
        entries.set(id, lines[i + 1]);
      }
    }
  }
  return entries;
}

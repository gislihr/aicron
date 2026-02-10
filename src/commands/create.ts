import { createInterface } from "node:readline/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { createJob } from "../db.ts";
import { installCronEntry } from "../crontab.ts";
import { whichSync, describeCron, c } from "../utils.ts";

const SCHEDULES = [
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Every day at 9:00 AM", cron: "0 9 * * *" },
  { label: "Every day at midnight", cron: "0 0 * * *" },
  { label: "Every Monday at 9:00 AM", cron: "0 9 * * 1" },
  { label: "Every weekday at 9:00 AM", cron: "0 9 * * 1-5" },
  { label: "Every 15 minutes", cron: "*/15 * * * *" },
];

export async function createCommand(prompt: string): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log(`\n${c.bold("How often should this run?")}`);
    for (let i = 0; i < SCHEDULES.length; i++) {
      console.log(`  ${c.cyan(String(i + 1))}) ${SCHEDULES[i].label}`);
    }
    console.log(`  ${c.cyan(String(SCHEDULES.length + 1))}) Custom cron expression`);

    const answer = await rl.question(`${c.bold("Choose")} [1-${SCHEDULES.length + 1}]: `);
    const choice = parseInt(answer.trim(), 10);

    let schedule: string;

    if (choice >= 1 && choice <= SCHEDULES.length) {
      schedule = SCHEDULES[choice - 1].cron;
    } else if (choice === SCHEDULES.length + 1) {
      const custom = await rl.question("Enter cron expression (e.g. 0 9 * * *): ");
      schedule = custom.trim();
      if (!schedule || schedule.split(/\s+/).length < 5) {
        console.error(c.red("Invalid cron expression. Need 5 fields."));
        process.exit(1);
      }
    } else {
      console.error(c.red("Invalid choice."));
      process.exit(1);
    }

    const jobId = createJob(prompt, schedule);

    // Install cron entry
    const bunPath = whichSync("bun");
    const entryPath = resolve(import.meta.dir, "../index.ts");
    const home = homedir();
    await installCronEntry(jobId, schedule, bunPath, entryPath, home);

    console.log(`\n${c.green("Created job")} ${c.bold(`#${jobId}`)}`);
    console.log(`  ${c.dim("Prompt:")}    ${prompt}`);
    console.log(`  ${c.dim("Schedule:")}  ${describeCron(schedule)} ${c.gray(`(${schedule})`)}`);
    console.log(`  ${c.dim("Status:")}   Active`);
  } finally {
    rl.close();
  }
}

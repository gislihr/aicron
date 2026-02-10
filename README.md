```
  ___  _  ___ _ __ ___  _ __
 / _ \| |/ __| '__/ _ \| '_ \
| (_| | | (__| | | (_) | | | |
 \__,_|_|\___|_|  \___/|_| |_|
```

# aicron

Schedule recurring Claude prompts using system cron. Set it and forget it.

aicron is a zero-dependency CLI tool that lets you run Claude prompts on a schedule — daily summaries, periodic code reviews, automated reports, or anything else you can ask Claude to do.

## Install

Requires [Bun](https://bun.sh) and the [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli).

```sh
git clone https://github.com/youruser/aicron.git
cd aicron
bun link
```

That's it. `aicron` is now available globally.

## Quick start

```sh
# Create a scheduled job (interactive schedule picker)
aicron 'Summarize the top 5 Hacker News stories'

# List all jobs
aicron list

# Show recent run results
aicron

# View a specific job and its output history
aicron show 1
```

## Commands

| Command | Description |
|---|---|
| `aicron 'prompt'` | Create a new scheduled job |
| `aicron list` | List all jobs with schedule and status |
| `aicron` | Show last 10 run results |
| `aicron show <id>` | Show job details + recent run output |
| `aicron pause <id>` | Pause a job (keeps history) |
| `aicron resume <id>` | Resume a paused job |
| `aicron remove <id>` | Delete a job and all its history |

## How it works

When you create a job, aicron:

1. Stores the prompt and schedule in a local SQLite database (`~/.aicron/aicron.db`)
2. Installs a crontab entry that calls `aicron run <id>` on your chosen schedule
3. Each run spawns `claude -p 'your prompt'`, captures the output, and stores it in the database

Crontab entries are tagged with comment markers so aicron can manage them without touching your other cron jobs:

```
# aicron:job:1
0 9 * * * HOME=/home/you /usr/bin/bun /path/to/src/index.ts run 1 >> ~/.aicron/cron.log 2>&1
```

## Schedule options

The interactive picker offers common presets:

```
How often should this run?
  1) Every hour
  2) Every day at 9:00 AM
  3) Every day at midnight
  4) Every Monday at 9:00 AM
  5) Every weekday at 9:00 AM
  6) Every 15 minutes
  7) Custom cron expression
```

Or enter any standard 5-field cron expression.

## Design

- **Zero npm dependencies** — uses `bun:sqlite`, `node:readline`, and system crontab
- **WAL mode SQLite** — safe if two cron jobs overlap
- **Absolute paths** in crontab entries — works reliably in cron's minimal environment
- **10-minute timeout** on Claude execution to prevent hung processes
- **Cascading deletes** — removing a job cleans up all run history

## Data

Everything lives in `~/.aicron/`:

```
~/.aicron/
  aicron.db       # SQLite database (jobs + run history)
  cron.log        # stdout/stderr from cron executions
```

## License

[MIT](LICENSE)

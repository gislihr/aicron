```
  ___  _  ___ _ __ ___  _ __
 / _ \| |/ __| '__/ _ \| '_ \
| (_| | | (__| | | (_) | | | |
 \__,_|_|\___|_|  \___/|_| |_|
```

# aicron

Schedule recurring AI prompts using system cron. Set it and forget it.

aicron is a zero-dependency CLI tool that lets you run AI prompts on a schedule — daily summaries, periodic code reviews, automated reports, or anything else you can ask an AI to do. By default it uses the [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli), but you can configure it to use any prompt command like `opencode`, `aider`, or custom scripts.

## Install

Requires [Bun](https://bun.sh) and a prompt CLI tool (defaults to [Claude CLI](https://docs.anthropic.com/en/docs/claude-cli), but configurable).

```sh
git clone https://github.com/youruser/aicron.git
cd aicron
bun link
```

That's it. `aicron` is now available globally.

### Configure a different prompt command

By default, aicron uses `claude -p` to run prompts. To use a different command, provide the full command with arguments (space-separated):

```sh
# Use opencode instead (opencode run "prompt")
aicron config set prompt_command "opencode run"

# Use aider (aider --message "prompt")
aicron config set prompt_command "aider --message"

# View current configuration
aicron config list

# Reset to default (claude -p)
aicron config delete prompt_command
```

The prompt text will be appended as the final argument to your configured command.

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
| `aicron config [list\|get\|set\|delete]` | Manage configuration (e.g., prompt command) |

## How it works

When you create a job, aicron:

1. Stores the prompt and schedule in a local SQLite database (`~/.aicron/aicron.db`)
2. Installs a crontab entry that calls `aicron run <id>` on your chosen schedule
3. Each run spawns your configured prompt command (default: `claude -p 'your prompt'`), captures the output, and stores it in the database

The prompt command is configurable via `aicron config set prompt_command "command args"`, allowing you to use any CLI tool that accepts prompts as the final argument.

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
- **Configurable AI backend** — use Claude CLI, opencode, or any prompt command
- **WAL mode SQLite** — safe if two cron jobs overlap
- **Persistent configuration** — settings stored in SQLite
- **Absolute paths** in crontab entries — works reliably in cron's minimal environment
- **10-minute timeout** on prompt execution to prevent hung processes
- **Cascading deletes** — removing a job cleans up all run history

## Data

Everything lives in `~/.aicron/`:

```
~/.aicron/
  aicron.db       # SQLite database (jobs + run history + config)
  cron.log        # stdout/stderr from cron executions
```

The database contains three tables:
- `jobs` — scheduled prompts and their cron expressions
- `runs` — execution history with stdout/stderr
- `config` — persistent configuration (e.g., `prompt_command`)

## License

[MIT](LICENSE)

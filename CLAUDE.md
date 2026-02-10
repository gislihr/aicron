# CLAUDE.md — aicron

## What is this?

aicron is a CLI tool that schedules recurring Claude prompts via system cron. Built with Bun + TypeScript, zero npm dependencies.

## Tech stack

- **Runtime:** Bun (not Node)
- **DB:** `bun:sqlite` (WAL mode, stored at `~/.aicron/aicron.db`)
- **Interactive I/O:** `node:readline/promises` for text input, raw stdin for arrow-key pickers
- **Cron:** System crontab via `crontab -l` / `crontab -` (no temp files)
- **Execution:** Spawns `claude -p '<prompt>'` with 10-minute timeout
- **Dependencies:** None. Zero. Don't add any.

## Project structure

```
src/
  index.ts          # Entry point, shebang, arg parsing, command dispatch
  db.ts             # SQLite connection, schema migration, all queries
  crontab.ts        # Read/write/install/remove crontab entries
  utils.ts          # Paths, formatting, colors, shared pickList() widget
  commands/
    create.ts       # Interactive job creation with arrow-key schedule picker
    list.ts         # List all jobs (interactive, Enter → show detail)
    recent.ts       # Last 10 runs (interactive, Enter → show detail)
    run.ts          # Internal: called by cron to execute a job
    show.ts         # Show single job details + run history
    remove.ts       # Delete job + cron entry
    pause.ts        # Pause/resume (exports both pauseCommand and resumeCommand)
```

## Commands

- `aicron` — list jobs (interactive picker, Enter drills into job detail)
- `aicron 'prompt'` — create job (any unrecognized arg is treated as a prompt)
- `aicron list` — same as bare `aicron`
- `aicron runs` — show last 10 run results (interactive)
- `aicron show <id>` — job detail + recent run output
- `aicron run <id>` — internal, called by cron
- `aicron pause <id>` / `resume <id>` — toggle job active state
- `aicron remove <id>` — delete job, runs (CASCADE), and cron entry

## Key patterns

### Crontab entries
Tagged with comment markers for safe identification:
```
# aicron:job:<id>
<schedule> PATH=<user-path> HOME=<home> <bun-path> <index.ts-path> run <id> >> ~/.aicron/cron.log 2>&1
```
PATH is captured at job creation time because cron has a minimal PATH that won't find `claude` or `bun`.

### Interactive pickers
`pickList()` in `utils.ts` is the shared arrow-key picker widget. It takes item count + a render function. Returns selected index or -1 on cancel (q/Esc). Supports j/k vim keys too. Falls back to static output when stdin is not a TTY.

### Schedule picker in create.ts
Uses its own picker (not pickList) because it has grouped items with blank separator lines. The `buildLines()` / `renderMenu()` approach maps visual lines to selectable indices.

### Database
- WAL mode for concurrent access (two cron jobs firing at once)
- `ON DELETE CASCADE` on runs → jobs, so `deleteJob()` cleans up everything
- All datetimes stored as UTC via `datetime('now')`, displayed by appending "Z" and using `toLocaleString()`

### ANSI colors
`c.bold()`, `c.dim()`, `c.green()`, etc. in `utils.ts`. Auto-disabled when stdout is not a TTY. `pad()` strips ANSI codes when calculating string width.

## Running / testing

```sh
bun run src/index.ts --help     # verify it compiles and runs
bun run src/index.ts list       # test commands
aicron                          # if bun-linked
```

To test execution without waiting for cron:
```sh
bun run src/index.ts run <id>
```

## Data location

Everything in `~/.aicron/`:
- `aicron.db` — SQLite database
- `cron.log` — stdout/stderr from cron executions

## Common gotchas

- Job IDs use SQLite AUTOINCREMENT so they never reset, even after deletes
- `crontab -` reads from stdin to replace the entire crontab — always read first, modify, then write back
- The `run` command resolves `claude` via `which` at runtime — this works because PATH is baked into the cron entry
- `create.ts` resolves paths (`which bun`, `import.meta.dir`) at creation time and bakes absolute paths into crontab

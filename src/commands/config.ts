import { getConfig, setConfig, getAllConfig, deleteConfig } from "../db.ts";
import { c } from "../utils.ts";

export function configCommand(args: string[]): void {
  const subcommand = args[0];

  // List all config
  if (!subcommand || subcommand === "list") {
    const config = getAllConfig();
    const keys = Object.keys(config);
    
    if (keys.length === 0) {
      console.log(c.dim("No configuration set"));
      return;
    }

    console.log(c.bold("\nConfiguration:"));
    for (const key of keys.sort()) {
      console.log(`  ${c.cyan(key)}: ${config[key]}`);
    }
    console.log();
    return;
  }

  // Get a specific config value
  if (subcommand === "get") {
    const key = args[1];
    if (!key) {
      console.error("Usage: aicron config get <key>");
      process.exit(1);
    }
    const value = getConfig(key);
    if (value === null) {
      console.error(`Config key '${key}' not found`);
      process.exit(1);
    }
    console.log(value);
    return;
  }

  // Set a config value
  if (subcommand === "set") {
    const key = args[1];
    const value = args.slice(2).join(" ");
    if (!key || !value) {
      console.error("Usage: aicron config set <key> <value>");
      console.error("");
      console.error("Examples:");
      console.error("  aicron config set prompt_command \"claude -p\"");
      console.error("  aicron config set prompt_command \"opencode run\"");
      console.error("  aicron config set prompt_command \"aider --message\"");
      process.exit(1);
    }
    setConfig(key, value);
    console.log(`${c.green("✓")} Set ${c.cyan(key)} = ${value}`);
    return;
  }

  // Delete a config value
  if (subcommand === "delete" || subcommand === "unset") {
    const key = args[1];
    if (!key) {
      console.error("Usage: aicron config delete <key>");
      process.exit(1);
    }
    deleteConfig(key);
    console.log(`${c.green("✓")} Deleted ${c.cyan(key)}`);
    return;
  }

  console.error(`Unknown config subcommand: ${subcommand}`);
  console.error("");
  console.error("Usage: aicron config [list|get|set|delete]");
  console.error("");
  console.error("Examples:");
  console.error("  aicron config list");
  console.error("  aicron config get prompt_command");
  console.error("  aicron config set prompt_command \"opencode run\"");
  console.error("  aicron config delete prompt_command");
  process.exit(1);
}

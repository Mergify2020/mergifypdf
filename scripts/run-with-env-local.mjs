import fs from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/run-with-env-local.mjs <command> [args...]");
  process.exit(1);
}

const env = { ...process.env };
const envLocalPath = ".env.local";

if (fs.existsSync(envLocalPath)) {
  for (const line of fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
}

const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  env,
});

process.exit(result.status ?? 1);

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { isPortOpen } from "./dev-utils.mjs";

if (!process.env.CI && await isPortOpen()) {
  console.error('A development server is running on port 3000. Stop it before a local production build, or let GitHub Actions run the build.');
  process.exit(1);
}

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const existingNodeOptions = process.env.NODE_OPTIONS?.trim();
const memoryOption = "--max-old-space-size=4096";
const child = spawn(process.execPath, [nextBin, "build", "--webpack"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: [existingNodeOptions, memoryOption].filter(Boolean).join(" "),
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

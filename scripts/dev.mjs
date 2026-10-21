import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { appOrigin, DEV_PORT, isPortOpen } from "./dev-utils.mjs";

if (await isPortOpen()) {
  console.error(
    `Port ${DEV_PORT} is already in use. Reuse the running app or run "pnpm diagnose:dev" before starting another server.`,
  );
  process.exit(1);
}

const webpack = process.argv.includes("--webpack");
const origin = appOrigin();
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const args = [nextBin, "dev", webpack ? "--webpack" : "--turbopack", "--hostname", "0.0.0.0", "--port", String(DEV_PORT)];

console.log(`Starting MergifyPDF with ${webpack ? "Webpack fallback" : "Turbopack"}.`);
console.log(`Open: ${origin}`);

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    APP_ORIGIN: origin,
    NEXTAUTH_URL: origin,
    NEXT_PUBLIC_APP_URL: origin,
  },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

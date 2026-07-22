import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { isPortOpen } from "./dev-utils.mjs";

if (await isPortOpen()) {
  console.error('Refusing to clean .next while the development server is running. Stop it first, then rerun "pnpm dev:clean".');
  process.exit(1);
}

const target = path.join(process.cwd(), ".next");
if (!fs.existsSync(target)) {
  console.log("No .next cache exists. Nothing to clean.");
  process.exit(0);
}

console.log(`Removing generated Next.js cache only: ${target}`);
fs.rmSync(target, { recursive: true, force: true });
console.log("Next.js cache removed. Source files, databases, uploads, and environment files were not touched.");

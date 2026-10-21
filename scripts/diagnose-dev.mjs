import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { DEV_PORT, isPortOpen } from "./dev-utils.mjs";

function command(name, args) {
  try {
    return execFileSync(name, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unavailable";
  }
}

function directorySize(target) {
  if (!fs.existsSync(target)) return 0;
  let total = 0;
  const stack = [target];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile()) total += fs.statSync(entryPath).size;
    }
  }
  return total;
}

function formatBytes(bytes) {
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const processRows = command("ps", ["-eo", "pid,ppid,%cpu,%mem,rss,etime,cmd", "--sort=-rss"])
  .split("\n")
  .filter((line, index) => index === 0 || /next-server|next\/dist\/bin|extensionHost|eslintServer/.test(line))
  .slice(0, 18);

const extensionHosts = processRows.filter((line) => /extensionHost/.test(line)).length;
console.log("MergifyPDF development diagnostics");
console.log(`CPU cores: ${os.cpus().length}`);
console.log(`Memory: ${formatBytes(os.totalmem() - os.freemem())} used / ${formatBytes(os.totalmem())} total`);
console.log(`.next size: ${formatBytes(directorySize(path.join(process.cwd(), ".next")))}`);
console.log(`Port ${DEV_PORT}: ${await isPortOpen() ? "in use" : "available"}`);
console.log(`VS Code extension hosts observed: ${extensionHosts}${extensionHosts > 1 ? " (close duplicate Codespace windows if unintended)" : ""}`);
console.log(`Workspace disk:\n${command("df", ["-h", process.cwd()])}`);
console.log("Relevant processes:");
console.log(processRows.join("\n") || "none");

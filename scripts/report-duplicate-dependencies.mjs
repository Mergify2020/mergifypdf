import fs from "node:fs";
import path from "node:path";

const lockfilePath = path.join(process.cwd(), "pnpm-lock.yaml");
const lines = fs.readFileSync(lockfilePath, "utf8").split(/\r?\n/);
const versionsByPackage = new Map();
let inPackages = false;

for (const line of lines) {
  if (line === "packages:") {
    inPackages = true;
    continue;
  }
  if (inPackages && /^[a-zA-Z]/.test(line)) break;
  if (!inPackages) continue;

  const match = line.match(/^  (?:'([^']+)'|([^:\s][^:]*)):\s*$/);
  const key = match?.[1] ?? match?.[2];
  if (!key || key.startsWith("file:") || key.startsWith("link:")) continue;
  const separator = key.lastIndexOf("@");
  if (separator <= 0) continue;
  const name = key.slice(0, separator);
  const version = key.slice(separator + 1).replace(/\(.*/, "");
  if (!version) continue;
  const versions = versionsByPackage.get(name) ?? new Set();
  versions.add(version);
  versionsByPackage.set(name, versions);
}

const duplicates = [...versionsByPackage]
  .filter(([, versions]) => versions.size > 1)
  .map(([name, versions]) => ({ name, versions: [...versions].sort() }))
  .sort((left, right) => left.name.localeCompare(right.name));

console.info(JSON.stringify({ duplicatePackageCount: duplicates.length, duplicates }, null, 2));
if (process.argv.includes("--fail") && duplicates.length > 0) process.exitCode = 1;

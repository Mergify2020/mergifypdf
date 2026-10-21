import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");
const staticDir = path.join(nextDir, "static");
const loadablePath = path.join(nextDir, "react-loadable-manifest.json");

if (!fs.existsSync(loadablePath)) {
  console.error("No production build found. Run pnpm build first.");
  process.exit(1);
}

function sizeOf(relativePath) {
  const filePath = path.join(nextDir, relativePath);
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const loadable = JSON.parse(fs.readFileSync(loadablePath, "utf8"));
const dynamicImports = Object.entries(loadable).map(([name, value]) => {
  const files = value.files ?? [];
  return {
    name,
    bytes: files.reduce((total, file) => total + sizeOf(file), 0),
    files,
  };
});

const routeEntries = walk(path.join(staticDir, "chunks", "app"))
  .filter((file) => /page-[a-f0-9]+\.js$/.test(file))
  .map((file) => ({
    routeEntry: path.relative(path.join(staticDir, "chunks", "app"), file),
    bytes: fs.statSync(file).size,
  }))
  .sort((left, right) => right.bytes - left.bytes);

const clientAnalyzerPath = path.join(nextDir, "analyze", "client.html");
const clientAnalyzer = fs.existsSync(clientAnalyzerPath)
  ? fs.readFileSync(clientAnalyzerPath, "utf8")
  : "";
const forbiddenClientPackages = ["@aws-sdk", "@prisma/client", "stripe", "resend"];
const serverPackageLeaks = forbiddenClientPackages.filter((packageName) => {
  const escaped = packageName.replace("/", "\\+");
  return new RegExp(`node_modules/\\.pnpm/${escaped.replace("@", "\\@")}[+@]`).test(clientAnalyzer);
});

console.info(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      enforcement: "report-only",
      routeEntries,
      dynamicImports,
      serverPackageLeaks,
    },
    null,
    2,
  ),
);

if (serverPackageLeaks.length > 0) process.exitCode = 1;

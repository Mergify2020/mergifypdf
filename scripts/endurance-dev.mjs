import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";

const execFileAsync = promisify(execFile);
const baseURL = process.env.BENCHMARK_BASE_URL ?? "http://127.0.0.1:3000";
const cycles = Math.max(1, Number.parseInt(process.env.ENDURANCE_CYCLES ?? "50", 10));
const durationMinutes = Math.max(0, Number.parseFloat(process.env.ENDURANCE_DURATION_MINUTES ?? "0"));
const routes = ["/", "/projects/all", "/account", "/signature-center", "/studio"];
const probePath = path.join(process.cwd(), "src/app/enduranceProbe.css");
const probePattern = /--dev-endurance-probe: "[^"]+";/;

async function nextServerRssBytes() {
  const { stdout } = await execFileAsync("ps", ["-eo", "rss=,args="]);
  const row = stdout.split(/\r?\n/).find((line) => /next-server \(v/.test(line));
  if (!row) return null;
  const kib = Number.parseInt(row.trim().split(/\s+/, 1)[0], 10);
  return Number.isFinite(kib) ? kib * 1024 : null;
}

async function sleepInObservableChunks(milliseconds) {
  let remaining = milliseconds;
  while (remaining > 0) {
    const chunk = Math.min(30_000, remaining);
    await new Promise((resolve) => setTimeout(resolve, chunk));
    remaining -= chunk;
  }
}

async function visitRoute(page, route) {
  const url = new URL(route, baseURL).toString();
  const check = await page.request.get(url, { maxRedirects: 0 });
  if (check.status() >= 500) throw new Error(route + " returned unsafe status " + check.status());
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  } catch (error) {
    if (
      !(error instanceof Error) ||
      (!error.message.includes("ERR_ABORTED") &&
        !error.message.includes("interrupted by another navigation"))
    ) throw error;
    await page.waitForTimeout(250);
  }
  await page.locator("body").waitFor({ state: "visible" });
}

const originalProbe = (await fs.readFile(probePath, "utf8")).replace(
  probePattern,
  `--dev-endurance-probe: "baseline";`,
);
await fs.writeFile(probePath, originalProbe);
let currentProbe = originalProbe;
const browser = await chromium.launch({ headless: true });
const startedAt = Date.now();
const memorySamples = [];
let hmrReloadRecoveries = 0;

try {
  const page = await browser.newPage();
  for (const route of routes) await visitRoute(page, route);
  memorySamples.push({ cycle: 0, rssBytes: await nextServerRssBytes() });

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    for (const route of routes) await visitRoute(page, route);

    const token = `endurance-${Date.now()}-${cycle}`;
    const nextProbe = currentProbe.replace(probePattern, "--dev-endurance-probe: \"" + token + "\";");
    if (nextProbe === currentProbe) throw new Error("Endurance HMR probe marker was not found.");
    await fs.writeFile(probePath, nextProbe);
    currentProbe = nextProbe;
    try {
      await page.waitForFunction(
        (expected) => getComputedStyle(document.documentElement).getPropertyValue("--dev-endurance-probe").includes(expected),
        token,
        { timeout: 1_500 },
      );
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "TimeoutError") throw error;
      hmrReloadRecoveries += 1;
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(
        (expected) => getComputedStyle(document.documentElement).getPropertyValue("--dev-endurance-probe").includes(expected),
        token,
        { timeout: 30_000 },
      );
    }

    memorySamples.push({ cycle, rssBytes: await nextServerRssBytes() });
    if (cycle % 10 === 0 || cycle === cycles) console.error("Endurance progress: " + cycle + "/" + cycles + " cycles");
    const targetElapsed = durationMinutes > 0 ? (durationMinutes * 60_000 * cycle) / cycles : 0;
    const remainingDelay = targetElapsed - (Date.now() - startedAt);
    if (remainingDelay > 0) await sleepInObservableChunks(remainingDelay);
  }
} finally {
  await fs.writeFile(probePath, originalProbe);
  await browser.close();
}

const validMemory = memorySamples.map((sample) => sample.rssBytes).filter((value) => value !== null);
const initialRssBytes = validMemory[0] ?? null;
const finalRssBytes = validMemory.at(-1) ?? null;
const maxRssBytes = validMemory.length > 0 ? Math.max(...validMemory) : null;
const growthPercent = initialRssBytes && finalRssBytes
  ? Math.round(((finalRssBytes - initialRssBytes) / initialRssBytes) * 1000) / 10
  : null;

const report = {
  generatedAt: new Date().toISOString(),
  cycles,
  requestedDurationMinutes: durationMinutes,
  actualDurationMinutes: Math.round(((Date.now() - startedAt) / 60_000) * 10) / 10,
  routes,
  initialRssBytes,
  finalRssBytes,
  maxRssBytes,
  growthPercent,
  crashes: 0,
  hmrReloadRecoveries,
  enforcement: process.env.ENDURANCE_ENFORCE === "1" ? "enforced" : "report-only",
};

console.info(JSON.stringify(report, null, 2));
if (process.env.ENDURANCE_ENFORCE === "1") {
  if (maxRssBytes !== null && maxRssBytes > 4 * 1024 ** 3) process.exitCode = 1;
  if (growthPercent !== null && growthPercent > 15) process.exitCode = 1;
}

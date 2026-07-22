import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseURL = process.env.BENCHMARK_BASE_URL ?? "http://127.0.0.1:3000";
const cycles = Math.max(3, Number.parseInt(process.env.HMR_BENCHMARK_CYCLES ?? "5", 10));

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function measureProbe(page, config) {
  const filePath = path.join(process.cwd(), config.file);
  const original = (await fs.readFile(filePath, "utf8")).replace(
    config.pattern,
    config.constantName + ' = "baseline"',
  );
  await fs.writeFile(filePath, original);
  let current = original;
  const samples = [];

  await page.goto(new URL(config.route, baseURL).toString());
  await page.locator(config.selector).waitFor({ state: "attached", timeout: 30_000 });

  try {
    for (let index = 0; index < cycles; index += 1) {
      const token = `hmr-${Date.now()}-${index}`;
      const next = current.replace(config.pattern, `${config.constantName} = "${token}"`);
      if (next === current) throw new Error(`HMR probe marker not found in ${config.file}`);
      const startedAt = performance.now();
      await fs.writeFile(filePath, next);
      current = next;
      await page.waitForFunction(
        ({ selector, expected }) => document.querySelector(selector)?.textContent === expected,
        { selector: config.selector, expected: token },
        { timeout: 30_000 },
      );
      samples.push(Math.round((performance.now() - startedAt) * 10) / 10);
    }
  } finally {
    await fs.writeFile(filePath, original);
  }

  return {
    route: config.route,
    samplesMs: samples,
    p95Ms: percentile(samples, 0.95),
  };
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const simple = await measureProbe(page, {
    route: "/",
    file: "src/components/DevHmrProbe.tsx",
    selector: "[data-dev-hmr-probe]",
    constantName: "HMR_PROBE_VERSION",
    pattern: /HMR_PROBE_VERSION = "[^"]+"/,
  });
  const studio = await measureProbe(page, {
    route: "/studio",
    file: "src/app/(app)/studio/StudioHmrProbe.tsx",
    selector: "[data-studio-hmr-probe]",
    constantName: "STUDIO_HMR_PROBE_VERSION",
    pattern: /STUDIO_HMR_PROBE_VERSION = "[^"]+"/,
  });
  console.info(JSON.stringify({ generatedAt: new Date().toISOString(), cycles, simple, studio }, null, 2));
} finally {
  await browser.close();
}

import process from "node:process";
import { performance } from "node:perf_hooks";

const baseUrl = process.env.BENCHMARK_BASE_URL || "http://127.0.0.1:3000";
const routes = ["/", "/projects/all", "/account", "/signature-center", "/studio"];
const samples = [];

async function visit(route, pass) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(route, baseUrl), {
      redirect: "manual",
      headers: { "x-mergifypdf-benchmark": "1" },
    });
    return {
      route,
      pass,
      status: response.status,
      durationMs: Math.round((performance.now() - started) * 10) / 10,
    };
  } catch (error) {
    return {
      route,
      pass,
      status: 0,
      durationMs: Math.round((performance.now() - started) * 10) / 10,
      error: error instanceof Error ? error.message : "request failed",
    };
  }
}

for (const pass of ["cold-route", "warm-route"]) {
  for (const route of routes) {
    samples.push(await visit(route, pass));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  note: "No credentials, response bodies, environment values, or customer data are recorded.",
  samples,
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("MergifyPDF development route benchmark");
  for (const sample of samples) {
    console.log(`${sample.pass.padEnd(11)} ${sample.route.padEnd(20)} ${String(sample.status).padEnd(3)} ${sample.durationMs} ms`);
  }
  console.log('Run "pnpm benchmark:dev -- --json" for machine-readable output.');
}

if (samples.some((sample) => sample.status === 0)) process.exitCode = 1;

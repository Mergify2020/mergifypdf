const baseUrl = process.argv[2] ?? process.env.DEPLOYMENT_URL;

if (!baseUrl) {
  console.error("Usage: pnpm smoke:deploy -- https://deployment.example");
  process.exit(1);
}

const base = new URL(baseUrl);
if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) {
  console.error("Deployment smoke checks require HTTPS outside localhost.");
  process.exit(1);
}

const allowedSuffix = process.env.SMOKE_ALLOWED_HOST_SUFFIX?.trim();
if (allowedSuffix && base.hostname !== allowedSuffix && !base.hostname.endsWith(`.${allowedSuffix}`)) {
  console.error("Deployment smoke check refused: host is outside the configured suffix.");
  process.exit(1);
}

async function check(path, validate) {
  const startedAt = performance.now();
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
    headers: { "user-agent": "MergifyPDF-safe-smoke-check/1.0" },
  });
  const durationMs = Math.round(performance.now() - startedAt);
  const ok = response.status < 500 && (!validate || await validate(response));
  console.info(`${ok ? "PASS" : "FAIL"} ${path} status=${response.status} durationMs=${durationMs}`);
  if (!ok) process.exitCode = 1;
}

await check("/");
await check("/login");
await check("/api/health/runtime", async (response) => {
  if (!response.ok) return false;
  const body = await response.json().catch(() => null);
  return body?.ok === true && body?.code === "OK";
});

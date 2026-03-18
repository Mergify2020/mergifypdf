import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();

function readEnvFile(name) {
  const filePath = path.join(cwd, name);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const match = content.match(/^DATABASE_URL=(.*)$/m);
  if (!match) {
    return { file: name, raw: null, parsed: null };
  }

  const raw = match[1].trim().replace(/^"(.*)"$/, "$1");
  return { file: name, raw, parsed: parseDbTarget(raw) };
}

function parseDbTarget(raw) {
  try {
    const normalized = raw.startsWith("postgres://") || raw.startsWith("postgresql://")
      ? raw
      : raw.replace(/^prisma\+postgres:\/\//, "postgres://");
    const url = new URL(normalized);
    return {
      host: url.hostname || null,
      port: url.port || null,
      database: url.pathname.replace(/^\/+/, "") || null,
      username: url.username || null,
    };
  } catch {
    return null;
  }
}

const env = readEnvFile(".env");
const envLocal = readEnvFile(".env.local");

const summary = { env, envLocal };
console.log(JSON.stringify(summary, null, 2));

if (!env || !envLocal || !env.parsed || !envLocal.parsed) {
  process.exit(0);
}

const drift =
  env.parsed.host !== envLocal.parsed.host
  || env.parsed.port !== envLocal.parsed.port
  || env.parsed.database !== envLocal.parsed.database
  || env.parsed.username !== envLocal.parsed.username;

if (drift) {
  console.error("DATABASE_URL drift detected between .env and .env.local");
  process.exit(1);
}
